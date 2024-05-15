---
title:  "Donating With Bitcoins"
date:   2014-09-12
lastmod: 2014-09-13
summary: "A guided adventure into the unknown."
categories:
  - site
aliases:
  - /site/update/donations/2014/09/12/donating-with-bitcoins.html
---

[Bitcoin](https://bitcoin.org) is something that's been in tech news a fair bit over the last year and a bit, for good and bad reasons. It is interesting though, so I thought I'd see what all the fuss is about, and add another donation option at the same time.

### Getting Started

I found the official site to be the most cautious, which is nice to see. Plenty of stress on the risks involved, whereas some of the other sites and articles I looked up tried to sell it as simpler than breathing and more secure than one-time pads. It's obviously neither of those.

Anyway, I chose [GreenAddress](https://greenaddress.it) as my wallet, as it was desktop and Android compatible, and had Two-Factor Authentication. Setup through the Chrome app was a breeze, but after that it gets slightly confusing.

Because all Bitcoin transactions occur openly, GreenAddress (like many other wallets) generates new a address for you whenever you want to make or receive a payment. These per-transaction addresses do introduce some privacy, but I want to put one address on my site, and for people to be able to pay to that address. The price I pay for this (no pun intended) is that all transactions on that address are publicly visibile, but I'm receiving donations, not running a drug cartel, so I'm not particularly bothered by that.

The confusion arises because it's not clear whether the per-transaction nature of the generates addresses is enforced, or suggested. Can I just choose to continue to use the last address generated, or will that cause funds to disappear into a black hole? I didn't know, so as the experimentalist I am, I decided to try it out and see what happened.

### Buying Bitcoins

The first hurdle was getting ahold of some bitcoins: there are few reputable exchanges out there that deal in the UK, and lots that at least look fairly dodgy. In the end, I chose to use [Bittylicious](https://bittylicious.com), which has a terribly unreassuring website and payment process, but it did have the advantage that I didn't need to supply my bank account details through their site.

Instead, the process is as follows:

1. I give my Bitcoin wallet address, which was one of these generated GreenAddress ones, and specify how much I'd like to buy: they have a currency converter, so I chose to put in £10, which was enough money that I'd learn a lesson should I lose it, but not so much that I'd lose sleep over it.
2. They provide the bank account number and sort code of a seller, a reference and the amount to pay.
3. I log into my online banking account, and pay the amount to the seller with the given reference.
4. They confirm payment receipt, and post some number that is the transaction ID (or something like that) on Bitcoin's system.

I then check my wallet, and in under a minute I had a notification telling me that my funds had arrived. I now had 0.03 bitcoins (BTC)!

### Paying An Old Address

I then went into GreenAddress's "Receive Money" tab, and copied the Bitcoin address there, then switched to another tab, and back again: the address shown the second time was different.

After using the "Send Money" tab to transfer 0.06 mBTC (0.00006 bitcoins: the minimum allowed amount, roughly 2p) to the copied address, I got the notification, and saw in the "Transactions" tab that the payment had been recognised as "Re-deposited". Unfortunately, I was still charged the 0.1 mBTC transaction fee, so I basically just lost money for nothing. The payment worked, but I wasn't sure if it was just a special case.

Next, I set up a new account (you can have multiple accounts within your GreenAddress account), and tried to transfer between the two accounts, as I did before. This time, I could see that 0.16 mBTC was taken from my sending account, and 0.06 mBTC arrived in my receiving account.

The conclusion to that little experiment is therefore that although GreenAddress gives you a new address for each transaction, old addresses don't invalidate. Of course, there's the still the unknown that they may invalidate only after a set amount of time, but you'd hope that information would be readily available if it was the case, since it's not clear from simple testing.

Somewhat worrying was that for both transactions, I got an error message saying that the Electrum network wasn't reachable, so there would be less assurance for the payment. Still, everything went smoothly, so maybe that's not such an issue.

### Rough Edges

They're everywhere. The GreenAddress service is pretty slick though --- if you're looking to try Bitcoin out, I'd definitely recommend it. One thing that stuck out like a sore thumb though was that Bitcoin addresses are styled like links, but clicking on them does nothing, and there's no option to copy them to the clipboard except higlighting + Ctrl-C. On a similar note, GreenAddress can also generate QR codes, but it doesn't offer you any way to save the images, so I had to take a screenshot, which seems like a pretty big oversight to me.

### Bitcoins as a Donation Option

#### Site Security

One thing that's very important but not really touched on when discussing payment is that if you pay money to the wrong address, you'll never see it again unless you can persuade the actual recipient to repay you. "But Bitcoin addresses are long enough that you'll be copy/pasting them", I hear you say!

Yes, but "where do you copy them from?" is the question, and *secure locations* is the answer. In my case, if I put my address up on my site, and serve it over regular HTTP, anyone could perform a man-in-the-middle attack and replace my address with theirs, and you'd end up sending money to *the bad guys*. I don't want that, and you don't want that.

Now, I use a browser extension called [HTTPS Everywhere](https://www.eff.org/https-everywhere) that forces encrypted (HTTPS) connections for lots of sites that have them available but optional. GitHub are wonderful people, and so `github.io`, the domain under which my site lives, is one of them. I always see my site over a HTTPS connection, thanks to HTTPS Everywhere, but if I disable it, I can access my site over HTTP too.

I can't guarantee that you have such an extension enabled, or that it works for `github.io`. I can't use technologies like [HTTP Strict Transport Security](https://developer.mozilla.org/en-US/docs/Security/HTTP_Strict_Transport_Security) to force HTTPS, because I don't have access to modify the headers GitHub sends. I have implemented a Javascript redirect, but that's easily avoidable by middle-men.

This is an unfortunate problem that's not unique to Bitcoin though: anything on insecure pages could be altered: my PayPal link, the Flattr button, my own name, etc. I just hadn't really thought of it until now. I've sent an email to GitHub Support asking about the possibility of adding HSTS support, and here's hoping I'll get a positive reply.

Just remember: be careful when dealing with money or other sensitive information on the Internet, and only trust it if you're connected to the page over HTTPS, ie. if there's a green lock in your browser's address bar. Though if you have been MitM'ed, I'd expect that this message has also been removed...

#### My Bitcoin Address

Anyway, my Bitcoin address as a `bitcoin:` URI, QR code and plain text can be found [here]({{< ref "bitcoin" >}}).
