---
layout: post
title:  BOSS Development Resumed!
date:   2015-08-23
summary:  I’ve been replaced, and it’s in good hands.
---

## A New Hope

I last made a commit to BOSS's code repository in May 2014. Since then, the utility's development has been stalled, and the Skyrim, Fallout 3 and Fallout: New Vegas masterlists have been left for dead as maintainers and users alike flocked to LOOT instead. Indeed, earlier today I finally updated them with messages explaining that they were unmaintained and directing users to LOOT instead, then set their repositories to read-only, marking the official end of their development.

Not so with Oblivion. Its masterlist has been given new life by [mhahn123](http://forums.bethsoft.com/user/618311-mhahn123/), who's doing his best to keep up with the feedback from BOSS's Oblivion users. It's a testament to the thoroughness of the Oblivion masterlist (and how difficult it is to replicate that) and the strength of the community that there's still a significant amount of activity and support around using BOSS for Oblivion.

Now Oblivion BOSS users have even better news, as code development has been taken up by that mysterious gentleman only known as [deaths_soul](http://forums.bethsoft.com/user/721559-deaths-soul/), [deathssoul](https://github.com/deathssoul) or [Visceral Moonlight](http://www.theassimilationlab.com/forums/user/745-visceral-moonlight/), depending on where you ask. I've worked with him on various things in the past, so the code's in good hands - better hands than mine (at least at the time), even! I'll still be around to manage the project and help out with advice and information, but I plan to stay clear of doing any programming myself, because I really do need to focus on the things I'm already doing.

His development thread is currently found on his own modding community site, [The Assimilation Lab](http://www.theassimilationlab.com/forums/topic/14996-boss-program-discussion-and-development), where his [development repository](http://gitlab.theassimilationlab.com/deaths_soul/boss) is hosted. Though it's early days yet, the current idea is that the [GitHub repository](https://github.com/boss-developers/boss) will act as a mirror of that. We'll work things out more firmly and in greater detail as the dust settles.

## The Roadmap

Right now, the focus is on:

1. Producing a working build
2. Reducing the number of dependencies, primarily through use of C++11
3. Improving the code quality

BOSS's code is pretty terrible. It was the best I could do at the time, but I've already come a long way since then, and looking back on it both design and implementation could do with a lot of improvement work, so that will take a while. There are also numerous improvements to be made to ease the development process.

Beyond that, we've floated the following ideas between us:

* Remote masterlist repository mirroring/redundancy, so that if URL is inaccessible, BOSS will try another.
* Restoring and improving the BOSS API.
* Fixing the unrecognised plugin submitter.
* Removing Skyrim, Fallout 3 and Fallout: New Vegas support.

There's no telling which, if any, of the above will actually happen (it's up to deaths_soul, since he'll be doing the work), but the message to take away is that BOSS's future is looking good again.

On a personal note, having someone else take up work on something I started is a real validation that it has significant value beyond what I saw and see in it, and so I think it's wonderful that deaths_soul has picked BOSS up again, and I look forward to seeing what he does with it.
