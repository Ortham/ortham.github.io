---
title: My Spotify extended streaming history data
date: 2024-12-21
summary: An overview of the data and some of its oddities and inconsistencies.
---

I've been using Spotify since July 2014, though with a big break from March 2015 to November 2017 (during that period I'd gone back to using Google Play Music instead).

At the start of December I downloaded my Spotify extended streaming history. I'd recently tried [stats.fm](https://stats.fm/) and was disappointed by the small range of stats it provided, even after paying $7.20 for the Plus tier. I was curious whether I could get much more from the data myself, perhaps closer to what is provided by [Last.fm](https://www.last.fm), but for existing historical data.

A secondary motivation was to see if the data would help me get a sense of the value for money that I'm getting from Spotify. I own a lot of the music that I've got in my Spotify "Liked Songs" playlist, but that's an incomplete representation of what I actually spend my time listening to, and manually matching up owned tracks to Spotify tracks is time-consuming. Questions I had were things like "would it be cheaper to buy the music that I mostly listen to instead?" and "if I were to start buying music again, which tracks or albums that I don't own do I listen to the most?".

## The Extended Streaming History Data

You can request your Spotify extended streaming history data from your account privacy settings page. The page says that the preparation time is 30 days, but I'm pretty sure that's because that's GDPR limit: in my case it took about 4 hours to receive the email with the download link.

The data comes as a zip archive of a directory of JSON files that contain the data, split so that each file has a maximum size of about 12 MB, plus a PDF file that describes the data structures in those files. Each JSON file holds a JSON array of objects that look like this:

```json
{
    "ts": "2014-07-27T20:34:47Z",
    "platform": "Android OS 4.2.2 API 17 (samsung, GT-I9195)",
    "ms_played": 35422,
    "conn_country": "GB",
    "ip_addr": "92.40.248.131",
    "master_metadata_track_name": "Communication Breakdown - Remaster",
    "master_metadata_album_artist_name": "Led Zeppelin",
    "master_metadata_album_album_name": "Led Zeppelin",
    "spotify_track_uri": "spotify:track:2whQxHDxButA5STZ32FYme",
    "episode_name": null,
    "episode_show_name": null,
    "spotify_episode_uri": null,
    "reason_start": "appload",
    "reason_end": "endplay",
    "shuffle": false,
    "skipped": true,
    "offline": false,
    "offline_timestamp": null,
    "incognito_mode": false
}
```

My history consists of 227024 of those objects, totalling 155 MB of pretty-printed JSON.

Most of the fields are obvious, but there were a few things that I discovered that weren't documented.

### Platforms

Although the `platform` value above holds a lot of detail (the OS, OS version and make and model of my phone at the time), since the 19th of October 2023 the platform is just recorded as `android`, `linux`, `windows` or `not_applicable` (I haven't used Spotify on macOS since then, so I don't know what that looks like now). Before that point, other values in my history include `Windows 10 (10.0.17763; x64)`, `OS X 10.13.3 [x86 8]`, `web_player windows 10; chrome 79.0.3945.117;desktop` and `Linux [x86-64 0]`.

It is quite interesting to see how I switched between different Android phones and Windows 10 versions over time, but ultimately I don't think that level of granularity is particularly useful, and it makes the data a little more difficult to work with, so I'm in favour of the newer values.

### Tracks, albums and URIs

Consider the following tracks:

- `spotify:track:16vteDeKePbpJBUgDroiIJ` is "A New Hope and End Credits" from the album "Star Wars: Revenge of the Sith (Original Motion Picture Soundtrack)"
- `spotify:track:5q64GC0gYbd6ChFiLKPBqt` is "A New Hope and End Credits" from the album "Star Wars: Revenge of the Sith (Original Motion Picture Soundtrack)"
- `spotify:track:6Fn0e2A8gpkdbkVEDxnF3f` is "A New Hope and End Credits" from the album "Star Wars: Revenge of the Sith (Original Motion Picture Soundtrack)"
- `spotify:track:4kPwWuLQN7jrxzhMM3QNwQ` is "A New Hope and End Credits - Medley" from the album "Star Wars Episode III: Revenge of the Sith [Original Motion Picture Soundtrack]".

I used Spotify's web API (more on it later) to retrieve more information about those tracks, and they:

- belong to 4 different albums: `spotify:album:6zhlos3HFJrWni7rjqxacg`, `spotify:album:1mtdjfjYU4lL6CMDk6T5Vf`, `spotify:album:2nm0ehEbV8rnKKZppxhawc` and `spotify:album:5dbVApKV5xebsSjsSnYnTW` respectively. Though the first three have the same name, only the first one is currently available in any markets on Spotify, and it's missing "London Voices" as an artist. The latter two albums also have different artwork. Otherwise, the four albums seem identical.
- have different ISRCs (more on them in a later post): `USWD11785350`, `USSM10501392`, `USSM10501392` and `USSM10902163` respectively.

While these are different tracks, I'm sure they're the same recording of the same piece of music, but because they've got different track URIs their streams would be counted separately: that's a problem when number of streams or streamed duration per track is something I'm directly and indirectly interested in.

Also, three of the tracks have the same name, but the fourth has a suffix, and the fourth also has an album name that's different but not meaningfully so. That means I can't reliably use track names or album names as part of a way to deduplicate tracks like this.

While having four releases of what is functionally the same album seems pointlessly annoying, the same recording can also appear as multiple tracks in more reasonable cases like when it's released as a single and then included in a later album release, and maybe later also in a compilation album. Whatever the reason, it still skews the listening stats.

To get a sense of the scale of the problem, I manually went through the albums and their play counts to merge duplicates, and that caused the number of albums to drop from 537 to 497, and the order when sorted by play count changed significantly for some merged albums. I didn't incorporate that into the dataset for further analysis though. I also don't have stats for how many duplicate tracks there are, because there were just too many for me to go through in the same way.

### Start reasons, end reasons and skipped streams

`reason_start` has values of `appload`, `backbtn`, `clickrow`, `clickside`, `fwdbtn`, `playbtn`, `popup`, `remote`, `trackdone`, `trackerror`, `unknown`, `uriopen` and an empty string in my streaming history.

  - `clickside` (29 counts), `popup` (223), `uriopen` (15) and the empty string value (12) seem to have been obsoleted during my break from Spotify between 2015 and 2017. It's not clear how to map them to the other values.
  - `remote` and `trackerror` were introduced during my break from Spotify between 2015 and 2017.

`reason_end` has values of `appload`, `backbtn`, `clickrow`, `clickside`, `endplay`, `fwdbtn`, `logout`, `playbtn`, `popup`, `remote`, `trackdone`, `trackerror`, `unexpected-exit`, `unexpected-exit-while-paused`, `unknown`, `uriopen` and an empty string in my streaming history.

  - `appload` (202 counts), `clickrow` (344), `clickside` (28), `playbtn` (3), `popup` (209), `uriopen` (11) and the empty string value (19) seem to have been obsoleted during my break from Spotify between 2015 and 2017, though `appload`, `clickrow` and `playbtn` are still in use as a start reason. My guess is that they were folded into `endplay`, as that looks the closest in count over time.
  - `logout`, `remote`, `trackerror`, `unexpected-exit` and `unexpected-exit-while-paused` were introduced during my break from Spotify between 2015 and 2017.

I expected the `skipped` field to be related to the `end_reason` field, so that `skipped` would be `true` when `end_reason` was one of a set of values indicating that the user had selected something else to play, and `false` otherwise. However, all values between 2015-04-13 and 2022-10-16 are `false`, with a mix of `true` and `false` values appearing on either side of that time range.

Looking at how `skipped` relates to `reason_end`, some `reason_end` values appear for both `true` and `false`:

| `reason_end` value | `"skipped": true` count | `"skipped": false` count |
| ------------------ | ------------------------- | -------------------------- |
| `backbtn`          | 866                       | 2835                       |
| `endplay`          | 2692                      | 3979                       |
| `fwdbtn`           | 34526                     | 97952                      |
| `unknown`          | 17                        | 6                          |

Looking at the correlation between those `reason_end` values and the `skipped` values:

- `backbtn` and `unknown` are only present with `"skipped": false` during the period during which there were no `"skipped": true` values, and only appear with `"skipped": true` otherwise.
- `endplay` and `fwdbtn` are not present with `"skipped": false` after 2022-10-16. They are present with both `"skipped": false` and `"skipped": true` before 2015-04-13, but overwhelmingly with the latter.

It looks to me that there were a couple of bugs in Spotify's code that misclassified stream end reasons before 2022-10-16:

- No skips were recognised between 2015-04-13 and 2022-10-16.
- Some `"reason_end": "endplay"` and `"reason_end": "fwdbtn"` streams before 2015-04-13 were not recognised as being skipped.

Therefore the check for if a stream was skipped should be `skipped or reason_end in ('backbtn', 'unknown', 'endplay', 'fwdbtn')`.

### Timestamps and offline streams

As far as I'm aware, a Spotify account can only stream one thing at a time, so you might expect `ts` values to be unique. One reason that's not true is that the timestamps are given to the nearest second, and it's reasonable for one stream to end within a second of it starting (due to an error or quick user input), meaning that the next stream would share the same timestamp.

With that in mind, I thought that while you could have two streams with the same timestamp, you wouldn't see two streams overlap by more than one second. An overlap of up to one second is expected due to the loss of precision introduced by rounding the stream durations to the nearest second, plus the timestamp values having already had similar rounding done when they were recorded.

I wrote a Python script to sort the streams in ascending timestamp order and check for overlaps between consecutive streams using their `ts` and `ms_played` fields. That found 65946 streams that overlapped with their predecessor, totalling just over 8.3 days. When I filtered out overlaps of 1 second or less, that fell to 18126 streams overlapping by a total of just under 8.1 days.

The total streaming duration is 308.4 days, so ~ 2.6% of that is unexplained.

- 20 streams (1.25 days) overlapped by more than an hour
- 60 streams (2.46 days) overlapped by more than 30 minutes
- 376 streams (4.34 days) overlapped by more than 5 minutes

I had some ideas for why these > 1 second overlaps occurred, depending on where the `ts` value comes from.

- If the `ts` value is the timestamp of when the Spotify client ended the stream, then clock drift between different devices may cause overlaps of several seconds for consecutive streams that have different `platform` values.

- If the `ts` value is the timestamp of when the Spotify server is notified that the stream has ended, then:

  - variations in the time it takes for a notification to travel between the Spotify client and server and for the notification to be processed may be responsible for overlaps of several seconds
  - if a device is playing tracks offline, then when it comes back online it may notify Spotify of the tracks it played while offline (I don't actually know how offline playback works, this is a guess), so those tracks may all be given the same timestamp of when that notification was processed.

The first explanation (client timestamps) isn't backed up by the data that I have: consecutive streams on different platforms account for only 708 overlapping streams (3.2 days), and 146 (2.8 days) of them overlapped by more than 5 minutes, which means clock drift is an unlikely cause.

The second explanation (online processing delay) is beyond my ability to distinguish with the data I have, but it's insufficient anyway as it doesn't explain so many streams overlapping by several minutes or more.

For the final explanation (offline playback), I took a look at the `offline` and `offline_timestamp` fields. You'd think that if `offline` is `false` then `offline_timestamp` would be `null`, but that's not the case. Here's the number of streams with each combination:

|                                | `"offline": true` | `"offline": false` |
| ------------------------------ | ----------------- | ------------------ |
| `"offline_timestamp": null`    | 1130              | 179590             |
| `offline_timestamp` not `null` | 3766              | 42538              |

Those 42538 streams account for over 23% of my total streaming time. I've only ever used offline playback on my phone, which accounts for 54% of my streaming time, and I'm certain that I haven't spent almost half my phone's streaming time in offline mode. `"offline": true` streams account for 1% of my total streaming time, which is a lot more believable. I also checked how `offline` values were distributed over time and there's no big gap like I saw for `skipped`.

It doesn't seem like this is a case of `offline` being set incorrectly, but I don't know why you wouldn't have an `offline_timestamp` value when you're offline, or why you'd have one when you're online. It doesn't help that Spotify's PDF is unclear on what `offline_timestamp` actually means, saying only:

> This field is a timestamp of when offline mode was used, if used.

So is it:

1. when the device went into offline mode before or during the stream that it's set on
2. when the device came out of offline mode
3. when the stream started according to the offline device's clock
4. something else?

I had a look at some streams with `"offline": true`:

```json
[{
  "ts": "2021-07-10T16:07:56Z",
  "platform": "Android OS 7.0 API 24 (motorola, Moto G (4))",
  "ms_played": 303013, // start time 16:02:53
  "offline": true,
  "offline_timestamp": 1625932808248, // 16:00:08
},
{
  "ts": "2021-07-10T16:21:33Z",
  "platform": "Android OS 7.0 API 24 (motorola, Moto G (4))",
  "ms_played": 334893, // start time 16:15:58
  "offline": true,
  "offline_timestamp": 1625933433086 // 16:10:33
},
{
  "ts": "2021-07-10T16:21:33Z",
  "platform": "Android OS 7.0 API 24 (motorola, Moto G (4))",
  "ms_played": 312800, // start time 16:16:20
  "offline": true,
  "offline_timestamp": 1625933120791 // 16:05:20
},
{
  "ts": "2021-07-10T16:24:45Z",
  "platform": "Android OS 7.0 API 24 (motorola, Moto G (4))",
  "ms_played": 521066, // start time 16:16:03
  "offline": true,
  "offline_timestamp": 1625933768566, // 16:16:08
}]
```

These middle two streams are the only streams with that `ts` value, and are listed in that order. The offline timestamps are all different, but don't seem to relate to any of the stream start or end times.



When I filter the overlaps for cases where one or both of the streams are offline, I get:

|                                                                         | Stream count | Overlap duration                       |
| ----------------------------------------------------------------------- | ------------ | -------------------------------------- |
| One or both streams `"offline": true`                                   | 2295         | 2.09 days |
| One or both streams `"offline": true` or `offline_timestamp` not `null` | 4732         | 3.35 days |


It's also worth noting that `offline_timestamp`'s units switched from seconds to milliseconds at some point during my break between 2015 and 2017, so the data needs conversion to be consistent if the values are going to be used.

Another possibility is related to state desync between Spotify clients. If you start playing something on one client, that's supposed to be reflected on all other clients that you're logged into, but I've seen situations where I've started playback on one device, then switched to another device that doesn't show anything currently playing and played something different there, causing the first device's stream to pause. Sometimes I've then gone back to the first device and pressed play on that device to pick up where it left off, with no indication on that device that I listened to something else since that first stream was paused. I suspect that sort of situation would result in overlapping streams in the streaming history data, but I haven't tested it.

However, you've got cases like this that don't fit that explanation:

```json
[{
  "ts": "2021-09-26T10:39:37Z",
  "platform": "Android OS 7.0 API 24 (motorola, Moto G (4))",
  "ms_played": 5984871, // start time 08:59:52
  "reason_start": "clickrow",
  "reason_end": "trackdone",
  "offline": false,
  "offline_timestamp": null
},
{
  "ts": "2021-09-26T10:40:55Z",
  "platform": "Android OS 7.0 API 24 (motorola, Moto G (4))",
  "ms_played": 5984871, // start time 09:01:10
  "reason_start": "clickrow",
  "reason_end": "trackdone",
  "offline": false,
  "offline_timestamp": null
}]
```

In fact, both these entries are identical (including omitted fields) aside from their `ts` values. I've noticed this pattern several times. I though that maybe this is how pausing and resuming playback is recorded, but then I'd expect `reason_start` and `reason_end` to be different between the two streams (I'm not sure what reasons they'd use though).

There are also cases where two tracks have the same timestamp and one was offline but the other wasn't, which I also don't understand. For example:

```json
  [{
    "ts": "2021-09-12T20:47:37Z",
    "platform": "Android OS 7.0 API 24 (motorola, Moto G (4))",
    "ms_played": 241840, // start time 20:43:35
    "offline": true,
    "offline_timestamp": 1631479291529 // 20:41:31
  },
  {
    "ts": "2021-09-12T20:47:37Z",
    "platform": "Android OS 7.0 API 24 (motorola, Moto G (4))",
    "ms_played": 213240, // start time 20:44:03
    "offline": false,
    "offline_timestamp": null
  }]
```

I didn't end up getting to the bottom of this, and just made a mental note that there is some uncertainty in the accuracy of stream start times, end times and durations, with about 8% of `ts` values and about 2.6% of the total duration potentially being wrong.
