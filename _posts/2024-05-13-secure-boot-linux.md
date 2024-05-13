---
title: Replicating Bitlocker on Fedora 40
date: 2024-05-13
excerpt: A walkthrough of setting up a (mostly) working (roughly) equivalent to Bitlocker.
---

## Background

With Windows 10 reaching end of life in October 2025, Windows 11 being a half-baked regression in many ways, and the recent introduction of (more!) advertisements into Windows 11's Start menu, I thought it would be worth looking into how viable switching to Linux would be. As part of this, I went through what I use in Windows to check that there's an equivalent in Linux.

My PC uses Bitlocker full disk encryption with Secure Boot and TPM + PIN unlock, and replicating that on Linux turned out to be more difficult than expected. This post is a walkthrough of what's involved, explaining what needs to be done and providing complete step-by-step instructions. It's what I wished I'd found when I started looking into the subject. I've pieces the information here together from various man pages, blogs and wikis, and linked to them throughout this post.

## The Pieces

### Trusted Platform Modules (TPMs)

A TPM is a piece of hardware that can be used to store sensitive data in a way that is (supposedly) secure against unauthorised use or retrieval. It can be a dedicated device that you plug into your PC's motherboard, but modern AMD and Intel CPUs provide a TPM implementation as part of their CPUs, and that's what my PC uses.

A TPM can be used to store secrets like encryption keys, but also has a set of Platform Configuration Registers (PCRs), which can be used to store hashes of input data. These PCRs can be used to store data related to the boot process in a tamper-proof way.

### Secure Boot

Some types of malware can infect the components of the boot process and so run before the operating system loads. As such, they can bypass the OS's anti-malware detection and protections.

Secure Boot was introduced by Microsoft as partial protection against such malware, by requiring firmware and the bootloader to be digitally signed by a trusted certificate. The boot process verifies the signatures, and so can detect if the firmware or bootloader have been tampered with. Microsoft has ensured that (x86-based) Windows-certified motherboards (i.e. practically all motherboards) trust Microsoft's certificate by default, so that the Windows bootloader is trusted by default.

Linux distributions tend to rely on a shim EFI executable to simplify using Linux with Secure Boot. The shim is signed by Microsoft, and is what UEFI boots. When the shim boots, it boots the actual Linux bootloader EFI executable that's in use, and so you get Secure Boot without having to configure new certificates or having to get Microsoft to sign every Linux bootloader.

The shim requires that the EFI executable it launches is signed by a certificate that is trusted by UEFI or by the shim itself: the shim has an embedded database of distro-specific certificates. Those embedded certificates allow Linux distributions to supply bootloaders, Linux kernels, etc. that they sign instead of Microsoft.

A lot more information about the use of Secure Boot and the shim in Linux can be found [here](https://www.rodsbooks.com/efi-bootloaders/secureboot.html).

Secure Boot only covers the boot process up to launching the bootloader, and only cares about the signatures of EFI executables: other data files are out of scope. In Windows, something called Trusted Boot takes over once Secure Boot has allowed the bootloader to launch, by verifying the signatures of the Windows kernel and other components of the Windows boot process. There's also something called Measured Boot that records measurements of the whole boot process. There's a good overview of how the Windows boot process is secured [here](https://learn.microsoft.com/en-us/windows/security/operating-system-security/system-security/secure-the-windows-10-boot-process).

### Full disk encryption (FDE)

In Windows, full disk encryption is provided by Bitlocker. I've got it configured with TPM + PIN authentication and with a recovery key. The TPM + PIN authentication means that Bitlocker stores an encryption key in the TPM and configures the TPM to require a valid PIN to use the stored key. Despite the name, the PIN can contain non-numeric characters, though Windows limits the length to up to 20 characters.

When Bitlocker decryption happens during boot, Bitlocker checks the TPM PCRs to ensure that Secure Boot was successful (PCR 7 holds the Secure Boot measurement). If it was successful, Bitlocker will then ask for the PIN and pass that down to the TPM, and then use the key stored in the TPM to perform the decryption.

In Linux, the equivalent to Bitlocker is LUKS. [`systemd-cryptenroll`](https://www.freedesktop.org/software/systemd/man/latest/systemd-cryptenroll.html) can be used to allow LUKS decryption using TPM + PIN and expected PCR values, and can also be used to create a recovery key.

For both Bitlocker and LUKS the encryption key stored in the TPM is not the key used to encrypt your drive's data, as that would be slow and inflexible. Instead, it's used to encrypt the data encryption key, and that encrypted key is stored in an unencrypted area on your drive. That detail is not really relevant to the rest of this post, but it's worth knowing.

### Unified Kernel Images

Despite its name, full disk encryption doesn't actually encrypt a whole disk (unless it's a secondary data drive), as you need some unencrypted code somewhere that will do the decryption when you turn your computer on. At a high level, the bootloader, OS kernel and a minimal set of data and code it needs to do the decryption are stored on an unencrypted partition.

In Windows, Secure Boot and Trusted Boot together ensure that the unencrypted boot components have not been tampered with.

In Linux, the components involved are:

- the bootloader (e.g. GRUB)
- the Linux kernel
- the `initrd` (a.k.a. `initramfs`)
- the kernel command line parameters (which include which `initrd` to load)

As already described, the Secure Boot shim ensures the integrity of the bootloader and Linux kernel. However, nothing does the same for the `initrd` and kernel parameters. This means that there's a security hole in the equivalent to Trusted Boot: malware could modify your `initrd` or your kernel parameters and go undetected.

There are a few ways that you could resolve this, but the approach that has been most widely adopted is to create an EFI executable that combines the kernel and the `initrd` with an EFI stub that loads them. This is known as a [Unified Kernel Image](https://uapi-group.org/specifications/specs/unified_kernel_image/) (UKI).

As a UKI is an EFI executable (thanks to the included EFI stub), if it is signed then Secure Boot, the shim and bootloaders can verify its signature and therefore its integrity. If you're interested, [this blog post](https://0pointer.net/blog/brave-new-trusted-boot-world.html) goes into more detail on the problem that UKIs are trying to solve and how they work in more detail.

A significant complication is that the `initrd` is usually built locally so that it's tailored to your hardware, and kernel parameters are often also hardware-specific. That means the distro cannot supply a signed UKI (unless it's for a known hardware configuration, like a cloud provider's VMs), and so the UKI must be built and signed locally. That in turn means you need your own signing key and certificate, and you need to make UEFI trust that certificate. Such keys are known as Machine-Owner Keys (MOKs). They're also used to sign custom kernels and custom kernel modules, so you may come across the term in that context.

## Setting it all up

That's all the background, so here's what needs to be done:

1. Generate a MOK.
2. Generate a UKI from an existing kernel and `initrd`.
3. Use the MOK to sign the UKI.
4. Configure UEFI to trust the MOK.
5. Configure the boot process to boot the UKI.
6. Bind full disk encryption to Secure Boot and other relevant TPM PCRs.
7. Set up automatic generation of UKIs on kernel updates.

The steps below were carried out on Fedora 40, starting from a fresh install that set up FDE with a passphrase. I've also got a separate section further down covering the differences when running Fedora Atomic 40 (e.g. Silverblue, Kinoite).

The Linux install was done in a Hyper-V VM on Windows 10 Pro: real hardware (like a discrete Nvidia graphics card) may introduce some additional complications. I tried to install Fedora to dual-boot it, but the Fedora installer didn't like me having Windows partitions on the same disk.

### Generating a MOK and signed UKI

First install the packages we'll need:

```sh
sudo dnf install -y systemd-boot-unsigned systemd-ukify sbsigntools openssl
```

To generate a MOK, run [`ukify`](https://www.freedesktop.org/software/systemd/man/latest/ukify.html):

```sh
sudo ukify genkey \
    --secureboot-private-key /root/secure-boot.key \
    --secureboot-certificate /root/secure-boot.crt

sudo openssl x509 -outform DER -in /root/secure-boot.crt -out /boot/efi/MOK.cer
```

The `openssl` command is needed because the certificate needs to be DER-encoded to be trusted by Secure Boot.

To generate a UKI that's signed by that MOK, run:

```sh
KERNEL_VERSION=$(uname -r)

sudo ukify build \
    --linux /boot/vmlinuz-${KERNEL_VERSION} \
    --initrd /boot/initramfs-${KERNEL_VERSION}.img \
    --cmdline @/etc/kernel/cmdline \
    --os-release @/etc/os-release \
    --secureboot-private-key /root/secure-boot.key \
    --secureboot-certificate /root/secure-boot.crt \
    --output /boot/efi/EFI/Linux/linux-${KERNEL_VERSION}.efi
```

`/boot/vmlinuz-${KERNEL_VERSION}` and `/boot/initramfs-${KERNEL_VERSION}.img` are the existing kernel and `initrd` that the UKI is being built from.

You can then add a entry for the UKI to your UEFI boot menu using:

```sh
efibootmgr \
    --unicode \
    --disk /dev/sda \
    --part 1 \
    --create \
    --label "Linux ${KERNEL_VERSION} UKI" \
    --loader /boot/efi/EFI/Linux/linux-${KERNEL_VERSION}.efi
```

However, I wasn't able to get this working in Hyper-V because it doesn't provide access to UEFI settings, so I had no way to enrol my MOK directly with UEFI.

### Using the UEFI shim

While booting directly from UEFI to the UKI would be the simplest approach, we can take advantage of the UEFI shim: it comes with a utility called MokManager that allows you to enrol MOKs so that they are trusted by the shim.

You can optionally trigger the MOK enrolment on next boot by running:

```sh
sudo mokutil -i /boot/efi/MOK.cer
```

#### Booting the UKI directly from the shim

The shim is hardcoded to load GRUB, but you can make it load another EFI executable by simply replacing the GRUB executable. To replace GRUB with our own signed UKI, run:

```sh
sudo mv /boot/efi/EFI/fedora/grubx64.efi /boot/efi/EFI/fedora/grubx64.efi.bak
sudo cp /boot/efi/EFI/Linux/linux-$(uname -r).efi /boot/efi/EFI/fedora/grubx64.efi
```

Reboot now. If you haven't enrolled the MOK yet, the shim won't trust the UKI and Secure Boot will fail. The shim will display an error and then launch MokManager, which will offer the option to enrol a certificate: choose the `MOK.cer` file that was created earlier. Your PC will then reboot, and this time everything should work.

To check, run:

```sh
sudo bootctl
```

The output should show `Secure Boot: enabled (user)` and `Measured UKI: yes`. You can also check if Secure Boot is enabled by running `mokutil --sb-state`.

##### Tampering with MokManager?

Given that signature verification failure results in the ability to enrol a new key, what's stopping an attacker from taking advantage of that by enrolling a key of their own that they used to sign a compromised UKI of their own?

It is possible to set a password for MokManager by running `mokutil --password` from a terminal once you've booted and providing a password when prompted. If you do that, on next boot MokManager will prompt for that password and then allow you to set another password that it'll prompt for whenever you enter MokManager in the future.

However, it's not clear to me where this password is stored: I assume that it's in the TPM, as I can't think where else would be safe at that point in the boot process. If that is the case, that's probably good enough: a compromised MokManager could bypass the password check, but MokManager is signed so that would need one of the distribution signing keys to be compromised too.

There are other mitigations you can use to protect against this risk, as the MOK certificate is something that gets measured as part of Measured Boot, and you can bind FDE unlock to the relevant TPM PCR (14) so that if a different certificate is used the PCR will be different and unlock will not proceed. More on that later.

It's also worth noting that I'm assuming that the keys that Secure Boot trusts by default are trustworthy (it is possible to remove them, but I didn't investigate that), and that a UEFI password is set so that an attacker couldn't just enrol their own key and so have Secure Boot trust their compromised boot components signed with that key.

#### Booting the UKI through systemd-boot

Booting from shim to UKI isn't ideal as it means there's no way to choose between multiple UKIs (e.g. current and previous versions). To increase flexibility, you can introduce a bootloader, and `systemd-boot` is the simplest to use.

Install it using:

```sh
sudo bootctl install

sudo cp -f /boot/efi/EFI/fedora/shimx64.efi /boot/efi/EFI/BOOT/BOOTX64.EFI
sudo mv /boot/efi/EFI/fedora/grubx64.efi /boot/efi/EFI/fedora/grubx64.efi.bak
sudo cp /boot/efi/EFI/systemd/systemd-bootx64.efi /boot/efi/EFI/fedora/grubx64.efi

sudo sbsign --key /root/secure-boot.key --cert /root/secure-boot.crt --output /boot/efi/EFI/fedora/grubx64.efi /boot/efi/EFI/fedora/grubx64.efi
```

That sets up `systemd-boot` and makes UEFI boot directly to it, which we then undo so that the shim gets loaded, and we replace GRUB with `systemd-boot` so that the shim loads the latter, and we sign the renamed `systemd-boot` EFI file using the MOK that we already enrolled so that the shim trusts it.

`systemd-boot` automatically detects UKIs that are present in `/boot/efi/EFI/Linux/`, so there's no need to configure it to use the UKI.

On reboot, `sudo bootctl`'s output should show `Secure Boot: enabled (user)` and `Measured UKI: yes`.

#### Booting the UKI through GRUB

It's possible to use GRUB instead of `systemd-boot`, though it requires a little more config, and this post doesn't cover automating it.

To configure GRUB, add the following to `/etc/grub.d/40_custom`:

```
menuentry "Fedora UKI" {
    search --no-floppy --set=root --fs-uuid 1C11-0B16
    chainloader ($root)/EFI/Linux/linux-6.8.4-300.fc40.x86_64.efi
}
```

Replace the `--fs-uuid` value with your boot partition's UUID, and the EFI filename with the filename of the UKI generated by `ukify`. You can find your boot partition's UUID by looking for its entry in the output of `ls -l /dev/disk/by-uuid/`.

Once added, run:

```sh
grub2-mkconfig -o /boot/loader/grub.cfg
sudo systemctl reboot
```

Once again, `sudo bootctl`'s output should show `Secure Boot: enabled (user)` and `Measured UKI: yes`.

### Binding FDE unlock to TPM PCRs

Now that Secure Boot using a UKI is set up, you can configure FDE decryption to use TPM + PIN and bind it to TPM PCRs so that the TPM only allows access to the encryption key if the correct PIN is provided and the TPM PCRs have their expected values.

The standard PCRs and those used by Linux are documented [here](https://uapi-group.org/specifications/specs/linux_tpm_pcr_registry/). Those of interest to me are:

- 7 (Secure Boot)
- 11 (all components of UKIs)
- 12 (kernel command line parameters, system credentials and config)
- 13 (system extensions images for initrd)
- 14 (MOK certificates and hashes)

In my testing I found that changing the kernel image caused PCRs 4, 9, 10 and 11 to change. PCRs 12 and 13 were `0`, probably because there's nothing to measure for them when using a UKI, its embedded kernel command line and no extension `initrd` images.

You can set up TPM + PIN decryption with PCR bindings in a single command by running:

```sh
sudo systemd-cryptenroll --wipe-slot tpm2 --tpm2-device auto --tpm2-pcrs="7+12+13+14" --tpm2-with-pin true /dev/sda3
```

`/dev/sda3` was the partition that my LUKS volume was in, which I found by running `lsblk`. Although I'm interested in PCR 11, it is omitted because it relies on some additional setup and because I encountered some issues using it: more on that later.

When `systemd-cryptencroll` runs, it prompts for the disk's passphrase and then to create a new PIN. It won't touch the passphrase: that'll still be a valid way to decrypt the drive, as an alternative to the PIN.

Note that the PIN should **not** be the same as the LUKS passphrase, as the PCRs are checked *after* you enter the PIN, so if your system is compromised you could hand over your PIN to your attacker, and if it's the same as your passphrase they could use it as the passphrase and successfully decrypt your drive.

You may want to introduce the TPM + PIN and PCR bindings in several steps: you could start by omitting `--tpm2-with-pin true` and passing `--tpm2-pcrs=""` (since `7` is the default), so that the TPM is used for decryption without any checks, then add PCR numbers to `--tpm2-pcrs` one-by-one, and then finally adding `--tpm2-with-pin true` so that you're also prompted for a PIN on boot. At each stage you can reboot to test that FDE unlock works as expected.

If the `systemd-cryptenroll` command fails because the TPM is sealed, try running:

```
echo 5 | sudo tee /sys/class/tpm/tpm0/ppi/request
```

and then rebooting and trying again.

`systemd-cryptenroll` uses the current system state to predict the expected values of the PCRs you give it, so if you make changes that will affect PCR values (e.g. installing a new kernel version) then you may need to reboot and use your passphrase to unlock your drive before re-running `systemd-cryptenroll` to bind to the new PCR values.

As I mentioned earlier, I think that because I'm binding to TPM 14, the TPM won't allow access to the encryption key unless the UKI being booted is signed by the same key that was used to boot the OS when `systemd-cryptenroll` was last run. I think this means that there's no need to set a password for MokManager: while an attacker could enrol their own key in MokManager, if the computer is booted using a UKI that's signed by their key the PCR 14 value won't match the value that the TPM is expecting and it won't allow access to the encryption key. I haven't tested this though.

#### Firmware updates

It's worth noting that PCR 7's value changes when there are firmware/UEFI updates, and so on rebooting the PCR's value won't match the expected value and the TPM will not allow access to the encryption key.

This means that whenever there's a firmware update you'll need reboot, decrypt using something other than your PIN, then re-bind FDE to the TPM PCRs by re-running `systemd-cryptenroll` and re-entering your LUKS passphrase and PIN.

It should be possible to update the expected value when installing firmware/UEFI updates by predicting what the new value will be (presumably Windows does that, as it doesn't have this problem), but unfortunately when [fwupd](https://fwupd.org) runs there is no integration to do that. [`systemd-pcrlock`](https://www.freedesktop.org/software/systemd/man/latest/systemd-pcrlock.html) may resolve this issue, but is experimental at time of writing, so I didn't try it. I found some discussion of the issue on [this Arch wiki talk page](https://wiki.archlinux.org/title/Talk:Systemd-cryptenroll#TPM:_implicit_update_of_PCR7(+??)_with_fwupd).

#### Binding against TPM PCR 11

PCR 11 holds the measurement of all components of UKIs. Instead of binding against the measurement value itself, `systemd-cryptenroll`'s default behaviour is to bind against any value for which a given public key can verify a signature. I think the idea is that it's equivalent to how binding to the MOK certificate means that you can use any UKI that's signed by that certificate, rather than having to recreate the PCR bindings every time you replace the UKI.

This behaviour relies on signed PCR values being embedded within the UKI, which can be done during UKI creation like so:

```sh
sudo ukify genkey \
    --pcr-private-key /root/pcr.key \
    --pcr-public-key /root/pcr.pub

KERNEL_VERSION=$(uname -r)

sudo ukify build \
    --linux /boot/vmlinuz-${KERNEL_VERSION} \
    --initrd /boot/initramfs-${KERNEL_VERSION}.img \
    --cmdline @/etc/kernel/cmdline \
    --os-release @/etc/os-release \
    --secureboot-private-key /root/secure-boot.key \
    --secureboot-certificate /root/secure-boot.crt \
    --output /boot/efi/EFI/Linux/linux-${KERNEL_VERSION}.efi \
    --pcr-private-key /root/pcr.key \
    --pcr-public-key /root/pcr.pub
```

Note the two new `--pcr-private-key` and `--pcr-public-key` parameters passed to `ukify`.

On boot, if systemd sees that the UKI contains these signed PCR values and public key, it will copy them to files under `/run/systemd/`. `systemd-cryptenroll`'s default behaviour is to look for these files and if it finds them it will attempt to validate the signatures. It may be possible to disable that functionality by passing `--tpm2-public-key-pcrs=""` to `systemd-cryptenroll` as the default value is `11`, but I didn't test that.

Unfortunately I wasn't able to get PCR 11 validation to succeed. The boot log contained:

```
Error: Esys invalid ESAPI handle (40000001).
Convert handle from TPM2_RH to ESYS_TR, got: 0x40000001
Failed to unseal secret using TPM2: No such device or address.
```

and those lines were only present when booting from a UKI that had embedded PCR signatures. I thought the error might be because the Hyper-V TPM doesn't have `sha512` PCR banks, but I updated the `ukify` call to pass `--pcr-banks sha1,sha256,sha384` and nothing changed.

In the end I left out PCR 11 from the PCR bindings. Since PCR 14 holds the measurement of MOK certificates and hashes done by the shim, and since I'm using the shim during boot, I don't think binding to PCR 11 would really add any additional security over binding to PCR 14.

### Auto-generate UKI on kernel / initramfs changes

At this point we have a signed UKI that can be used with Secure Boot and which is verified as part of unlocking FDE. However, the Linux kernel is updated fairly frequently, and having to manually create a UKI every time would not be ideal.

In Fedora, `kernel-install` is run whenever a kernel is installed or uninstalled using `dnf`, and can be run manually as `kernel-install add`. It runs `dracut` to generate an `initramfs` as part of its installation processing, and can be made to generate signed UKIs using `ukify`. However, by default the UKI created does not include an `.initrd` section, due to mismatches between its `dracut` and `ukify` calls. The UKI also gets written to a path that `systemd-boot` does not look for UKIs in.

To make `kernel-install` run `ukify`, create a configuration file at `/etc/kernel/install.conf` containing:

```conf
layout=uki
```

To configure `ukify` to create a signed UKI, create another configuration file at `/etc/kernel/uki.conf` containing:

```conf
[UKI]
Cmdline=@/etc/kernel/cmdline
OSRelease=@/etc/os-release
SecureBootPrivateKey=/root/secure-boot.key
SecureBootCertificate=/root/secure-boot.crt
```

To fix the missing `.initrd` section in the UKIs that get created, you need to fix a script that treats an array variable as a string:

```sh
sed 's/"$UEFI_OPTS"/$UEFI_OPTS/' /usr/lib/kernel/install.d/50-dracut.install | sudo tee /etc/kernel/install.d/50-dracut.install > /dev/null
sudo chmod +x /etc/kernel/install.d/50-dracut.install
```

This fixes the `dracut` call in that install script, so that the kernel version and output image path parameters are not ignored. Without that fix, `kernel-install` generates the `initramfs` at `/boot/efi/$KERNEL_INSTALL_MACHINE_ID$/$KERNEL_VERSION/initrd` when a kernel is installed using `dnf`, and at `/boot/initramfs-$KERNEL_VERSION.img` when `kernel-install add` is run manually.

That's not quite enough, because the `initramfs` is then written to a different path than the one expected by `ukify`. To fix that, create a file at `/etc/kernel/install.d/51-uki-initrd.install` containing:

```sh
#!/usr/bin/sh

set -e

COMMAND="$1"
KERNEL_VERSION="$2"
BOOT_DIR_ABS="$3"

if [[ -d "$BOOT_DIR_ABS" ]]; then
	echo "$BOOT_DIR_ABS is a directory, unexpected!"
	exit 0
else
	if [[ -d $BOOT_DIR_ABS ]]; then
		IMAGE="initrd"
	else
		BOOT_DIR_ABS="/boot"
		IMAGE="initramfs-${KERNEL_VERSION}.img"
	fi
fi

BOOT_IMAGE_PATH="$BOOT_DIR_ABS/$IMAGE"
UKIFY_IMAGE_PATH="$KERNEL_INSTALL_STAGING_AREA/initrd-${KERNEL_VERSION}.img"

case "$COMMAND" in
	add)
		cp "$BOOT_IMAGE_PATH" "$UKIFY_IMAGE_PATH"
		;;
	remove)
		rm -f -- "$UKIFY_IMAGE_PATH"
		;;
esac
```

The exact filename doesn't matter, it just needs to run after `50-dracut.install`. Then run `chmod +x /etc/kernel/install.d/51-uki-initrd.install` to enable use of the file.

To fix the UKI file being written to the wrong place and so not being detected by `systemd-boot`, run:

```sh
sed 's|UKI_DIR="$BOOT_ROOT/EFI|UKI_DIR="$BOOT_ROOT/efi/EFI|' /usr/lib/kernel/install.d/90-uki-copy.install | sudo tee /etc/kernel/install.d/90-uki-copy.install > /dev/null
sudo chmod +x /etc/kernel/install.d/90-uki-copy.install
```

Alternatively, create a file at `/etc/kernel/install.d/91-copy-uki.install` containing:

```sh
#!/usr/bin/sh

set -e

COMMAND="$1"
KERNEL_VERSION="$2"

ENTRY_TOKEN="$KERNEL_INSTALL_ENTRY_TOKEN"
BOOT_ROOT="$KERNEL_INSTALL_BOOT_ROOT"
UKI_PATH="$BOOT_ROOT/efi/EFI/Linux/$ENTRY_TOKEN-$KERNEL_VERSION.efi"

case "$COMMAND" in
	add)
		install -m 0644 "$KERNEL_INSTALL_STAGING_AREA/uki.efi" "$UKI_PATH"
		;;
	remove)
		rm -f -- "$UKI_PATH"
		;;
esac
```

Then `chmod +x /etc/kernel/install.d/91-copy-uki.install`. Again, the exact filename doesn't matter, it just needs to run after `90-uki-copy.install`.

With all this done, every time a new kernel is installed, a corresponding signed UKI will also be generated and installed. Similarly, when a kernel is removed, its corresponding UKI will also be removed.

#### Generating UKIs using dracut

In Fedora, `dracut` is used to generate the `initramfs`, and can also be made to generate signed UKIs. I initially tried to use it instead of going through `kernel-install`, but found that the UKIs it generates are missing `.cmdline` and `.uname` sections. I thought that based on the content of the `dracut.cmdline(7)` man page, it might be possible to create the former by creating a symlink at `/etc/cmdline` that points to `/etc/kernel/cmdline`, but neither a symlink or a hardlink had any effect on the UKI created.

For what it's worth, to create UKIs with `dracut`, create `/etc/dracut.conf.d/uki.conf` (the filename doesn't matter) containing:

```
uefi=yes
uefi_secureboot_key=/root/secure-boot.key
uefi_secureboot_cert=/root/secure-boot.crt
```

### Bonus: Replacing the LUKS passphrase with a recovery key

As mentioned earlier, my Bitlocker configuration requires TPM + PIN or a recovery key to decrypt my drive. We've added TPM + PIN as a LUKS unlock option, but it's still possible to use the original passphrase to unlock the drive (and you'll need to use it if your bound PCR values change).

Unlike a passphrase, a recovery key is generated by the computer, so tends to be a much stronger form of password, though it's also probably much more difficult to remember (I store mine in my password manager, accessible on my phone if I need to use it).

`systemd-cryptenroll` also supports generating recovery keys. To remove the passphrase and create a recovery key, run:

```
sudo system-cryptenroll --wipe-slot password --recovery-key /dev/sda3
```

That displays the generated recovery key as text and as a QR code.

There are a couple of things to note:

- If you replace the passphrase with a recovery key, when subsequent invocations of `systemd-crypenroll` prompt you for the passphrase, enter the recovery key instead.
- The boot GUI for entering the unlock PIN/password/recovery key does not differentiate between those options: it's just a password field with no text. If one doesn't work, the screen does not display an error message, you just need to try entering another value.

If you've forgotten what a LUKS volume is bound to, you can check by running:

```sh
sudo cryptsetup luksDump /dev/sda3
```

where `/dev/sda3` is the partition holding the LUKS volume.

## Fedora Atomic

Things are a little different in Fedora Atomic (e.g. Silverblue, Kinoite).

### Unified Kernel Images in Fedora Atomic

Unfortunately Fedora Atomic [does not support](https://github.com/ostreedev/ostree/issues/1719) `systemd-boot`, so you need to use GRUB instead.

The process for generating a UKI is very similar to that described earlier, except:

- the kernel and initramfs both live in subdirectories of `/boot/ostree`, not in `/boot`, so their paths need adjusting wherever they appear in `ukify` calls.
- the `--cmdline @/etc/kernel/cmdline` parameter needs to be replaced with `--cmdline $(rpm-ostree kargs)` to avoid an error relating to being unable to mount to `/sysroot` on boot, as `/etc/kernel/cmdline` contains the wrong value.

I didn't test automatically generating UKIs, but the `kernel-install` scripts are different:

- The fix to `50-dracut.conf` is unnecessary.
- All the other changes detailed above are still necessary.
- You'll need to omit the `Cmdline` line from `/etc/kernel/uki.conf` since `/etc/kernel/cmdline` contains the wrong value.
- Unfortunately, if you run `kernel-install` manually then its `60-ukify.install` script will use `/etc/kernel/cmdline`. It looks like automated runs won't be affected because `/etc/kernel/cmdline` isn't used if `KERNEL_INSTALL_CONF_ROOT` is defined.

### TPM support in Fedora Atomic

Before you can use `systemd-cryptenroll`, the `tpm2-tss` module needs to be added to dracut's configuration. This can be done by creating a file at `/etc/dracut.conf.d/tpm2-tss.conf` (the filename doesn't matter) containing:

```
add_dracutmodules+=" tpm2-tss "
```

Fedora Atomic doesn't generate an initramfs locally by default, so that config won't have any effect until you run:

```sh
sudo rpm-ostree initramfs --enable
```

I also edited the content of `/etc/crypttab` to become:

```
luks-<UUID> UUID=<UUID> - tpm2-device=auto,discard
```

Where `<UUID>` is the UUID that's already present in the file. After I edited that file I regenerated the initramfs using:

```sh
sudo rpm-ostree initramfs-etc --force-sync
```

I'm not entirely sure that the `crypttab` edit was necessary, but Fedora Atomic doesn't enable TRIM on encrypted SSDs by default because it can leak information like (I think) the size of deleted files. If you don't care about that, enabling TRIM is a good idea, and that's what `discard` does.

## Other resources

I've linked to the resources that I used to understand the different pieces of the Linux boot process and get a Bitlocker-like boot working, but I also came across a few other pages that could be useful:

- Another walkthrough of setting up Secure Boot + TPM + FDE can be found in [this blog post](https://blastrock.github.io/fde-tpm-sb.html), though it's relatively old and the process can be made much simpler these days.
- The signing keys can be generated and enrolled with Secure Boot by following the instructions on [this Arch Wiki page](https://wiki.archlinux.org/title/Unified_Extensible_Firmware_Interface/Secure_Boot#Using_your_own_keys).
- [This Arch wiki page](https://wiki.archlinux.org/title/Unified_kernel_image) describes how a UKI can be built and signed in several ways.
- [This page](https://dimanne.github.io/Linux/secure_boot/) covers setting up Secure Boot and the equivalent to Trusted Boot and includes information on how to do so without relying on Microsoft's certificates and optionally without using UKIs.
- I found [this openSUSE blog post](https://news.opensuse.org/2023/12/20/systemd-fde/) after I'd written most of this post, and it goes into more detail about how everything involved works.
