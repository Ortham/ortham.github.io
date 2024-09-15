---
title: Secure Boot with an Nvidia graphics card on Fedora 40
date: 2024-07-12
summary: Simpler than I thought it would be.
categories:
   - Linux
   - Security
---

I've [previously written]({{< ref "2024-05-13-secure-boot-linux" >}}) about setting up a Bitlocker-like Secure Boot system using Unified Kernel Images (UKIs), but I was only able to test that out in a Hyper-V VM. I did have some free space on one drive, but when I installed Fedora to replicate what I'd done in the VM, I hit an issue that prevented me from booting into Fedora (I can't remember the details).

Since then, Fedora 40 has shipped support for [explicit sync](https://zamundaaa.github.io/wayland/2024/04/05/explicit-sync.html) as part of KDE Plasma 6.1 and the proprietary Nvidia driver's 555 release series, which resolves long-standing issues when using an Nvidia graphics card with the proprietary driver, so I thought I'd try installing Fedora again to see which of the graphical issues that I'd previously noticed had been fixed, and along the way I went through the process of setting up Secure Boot.

### Installing the Nvidia driver

First of all, I disabled Secure Boot in my UEFI settings, as I'd read that it might not work well with the Nvidia driver by default.

I installed Fedora 40's KDE spin with full disk encryption, and and was able to boot to the KDE desktop. From there, I immediately installed all available updates (as of 2024-07-11). This most notably updated KDE Plasma to 6.1 and the Linux kernel to 6.9.7-200.fc40.x86_64.

After rebooting, I enabled the "RPM Fusion for Fedora 40 - No free - NVVIDIA Driver" source in the Discover application's setting, then (following the instructions on [RPM Fusion](https://rpmfusion.org/Howto/NVIDIA)) ran the following in a terminal:

```sh
sudo dnf install akmod-nvidia \
   xorg-x11-drv-nvidia-cuda \
   vdpauinfo \
   libva-utils \
   nvidia-vaapi-driver
```

and then rebooted. Unfortunately that caused the kernel to boot to a black screen, and I couldn't enter my LUKS passphrase (I did try entering it blind, but nothing happened). I was able to work around this by appending `nomodeset` to the kernel parameters in GRUB's boot menu, and once I'd booted to the desktop I persisted that by adding it to `/etc/default/grub` and then running:

```sh
sudo grub2-mkconfig -o /boot/grub2/grub.cfg
```

I then rebooted again to check that the config had been updated correctly, and then verified that the Nvidia driver was in use by checking that the value of the "Graphics Processor" line in the "About this System" page of System Settings. It showed the name of my graphics card (an Nvidia RTX 3060 Ti), showing that it was using the Nvidia driver (a more precise test would have used the command line, but this was good enough).

`modinfo -F version nvidia` showed that the driver version I'd installed was `555.58.02`.

### Signing the Nvidia driver

I re-enabled Secure Boot in my UEFI settings and rebooted. This time the message "Nvidia kernel module missing, falling back to nouveau" was displayed on the boot splash screen, after I'd entered my LUKS passphrase. When I checked KDE's system settings about page, it reported that the graphics processor was llvmpipe. llvmpipe is a software rasteriser, *not* nouveau, and I think the kernel fell back to llvmpipe because the kernel parameters included a couple that blacklisted the nouveau driver: `rd.driver.blacklist=nouveau modprobe.blacklist=nouveau`. I think they were added when the Nvidia driver was installed.

The reason the kernel module appeared to be missing is because the driver provided by RPM Fusion isn't signed, so the Linux kernel will refuse to load it when Secure Boot is enabled, as without a signature it can't be validated.

The solution is to sign the Nvidia driver and enrol the signing certificate so that it's trusted by Secure Boot. RPM Fusion provides [instructions](https://rpmfusion.org/Howto/Secure%20Boot) for setting that up so that kernel modules are automatically signed when they're installed, which are:

1. Run the following commands to generate a signing key pair and prepare the certificate to be enrolled on next boot:

   ```sh
   sudo dnf install kmodtool akmods mokutil openssl
   sudo kmodgenca -a
   sudo mokutil --import /etc/pki/akmods/certs/public_key.der
   ```

   `mokutil` will ask you to provide a password: you'll only need to enter it once when you next reboot.
2. Reboot.
3. When the shim boots into the MOK Manager UI, choose "Enroll MOK", then "Continue", then "Yes" to confirm enrolment.
4. MOK Manager will prompt you for a password, enter the password you provided to `mokutil`.
5. Reboot when prompted to.

However, after following those steps I was still seeing the message about the Nvidia kernel module being missing, and it turns out that's because the process of setting up automatic signing doesn't trigger signing for any already-installed modules.

To trigger signing, I had to remove the Nvidia driver and reinstall it, but it wasn't enough to just remove `akmod-nvidia`. I found that the following worked:

```sh
sudo dnf remove \*nvidia\* --exclude nvidia-gpu-firmware
sudo dnf install akmod-nvidia \
   xorg-x11-drv-nvidia \
   xorg-x11-drv-nvidia-libs \
   xorg-x11-drv-nvidia-libs.i686
sudo akmods --force
```

After that finished I was able to verify that the module was now signed by running `modinfo nvidia`: the output included a line starting `signer:` and some other related lines. The signer is the subject CN of the signing certificate that was imported by `mokutil`, and I could also see that certificate loaded during the boot process using `sudo dmesg | grep -i 'x.*509'`.

### Using a Unified Kernel Image

I've already covered how to generate UKIs and bind LUKS decryption to TPM + PIN with PCRs in my [previous blog post]({{< ref "2024-05-13-secure-boot-linux" >}}), so I'll only mention a few things specific to running on real hardware:

- I had to disable kernel mode setting (KMS) to avoid getting a black screen on boot. I forgot to do that before generating the UKI, and `systemd-boot` doesn't let you edit kernel parameters while Secure Boot is enabled, so recovering from that involved jumping through a few extra hoops.

  I initially saw success by adding `nomodeset` to `/etc/kernel/cmdline`, but after more experimentation I found that the issue only occurred when the "iGPU Multi-Monitor" setting in my motherboard's BIOS was enabled (the motherboard is an ASRock Z370M-ITX/ac). Disabling that setting means that my iGPU isn't available at the same time as my graphics card, so I didn't want to do that, but it gave me the idea of trying to disable KMS for just the iGPU. I removed the `nomodeset` parameter and added `i915.modeset=0` and found that also worked.
- My LUKS configuration changes (done using `systemd-cryptenroll`) to bind disk decryption to TPM + PIN and PCRs 7, 12, 13 and 14 had no effect until I added `tpm2-device=auto` to the volume's options in `/etc/crypttab`.
- I did try binding LUKS to TPM PCR 11 via a certificate, but validation failed with the same boot errors logged as when I attempted it in a Hyper-V VM. My fTPM (provided by my Intel Core i5-8400 CPU) only has `sha1` and `sha256` banks, so I configured `systemd-cryptenroll` just to check the sha256 bank for PCR 11 (using `--tpm2-public-key-pcrs="11:sha256"`) but that didn't resolve the issue.

In the end using real hardware and the proprietary Nvidia drivers only complicated the process of setting up Secure Boot a little, though the limitations that were present when doing it in Hyper-V (being unable to bind to PCR 11, no automatic handling of firmware updates) remain.
