---
title: Identifying Spotify tracks that I own
date: 2025-01-07
summary: Automating the use of AcoustID fingerprints of local audio files.
---

*This is part four of a series of posts on my Spotify extended streaming history that started with {{< titleref "2024-12-21-spotify-streaming-history-part-1" >}}, and follows the third part, {{< titleref "2025-01-04-spotify-streaming-history-part-3" >}}.*

So far I've:

- taken a look at my Spotify extended streaming history data, and noticed a bunch of quirks in it
- augmented the dataset with additional track and album metadata from Spotify's web API, track tags (i.e. genres) from MusicBrainz and acoustic metadata from AcousticBrainz
- improved the MusicBrainz and AcousticBrainz match rate for the Spotify tracks in my streaming history, and reduced how long it takes to find matches.

Improving the match rate is something I could tinker with endlessly, so I decided to switch my attention to the last dataset I was missing: the music I own outside of Spotify. The goal was to be able to answer the question "do I own a copy of this?" given a track in my Spotify streaming history, without having to check manually.

With that in mind, I needed some input data that lists what tracks I own, and to then somehow match those tracks up with the Spotify tracks in my streaming history. There are a couple of complications:

- I may own the same recording as I've listened to on Spotify, but it could appear as different tracks in different albums (e.g. one might be the original album release, while the other might be from a compilation album).
- Even if it's the same track from the same album in and outside of Spotify, its name and its album name may be slightly different (as seen with ["A New Hope and End Credits"]({{< ref "2024-12-21-spotify-streaming-history-part-1#tracks-albums-and-uris" >}})).

Fortunately I've got almost all the tracks I own on CD ripped as FLACs (I've lost some of the CDs and their rips), as are most of my digital downloads (some are MP3s or WAVs). That means I can use them as my input data set, recursively scanning through the directory they're in and reading the audio files.

While most of those audio files have metadata tags, those tags don't include IDs such as ISRCs. However, I have just written about 8000 words on matching Spotify track URIs to MusicBrainz recordings, so if I could look up my audio files in MusicBrainz, then that would mean I'd have a set of MBIDs for those tracks, and I could then compare those MBIDs against the MBIDs that I've matched the Spotify tracks to: the intersection of those two sets would be the set of Spotify tracks that I own.

## MusicBrainz Picard & Mp3tag

[MusicBrainz Picard](https://picard.musicbrainz.org/) is a tool you can use to apply metadata tags to music, sourcing its data from the MusicBrainz database (other tools often also use MusicBrainz as a source). Using Picard, I was able to match my audio files to MusicBrainz recordings.

Using Picard in this way is a little clunky: once you've matched your music with MusicBrainz data, there doesn't seem to be any way to export the results aside from writing to your music files' metadata tags. In cases where there may be multiple matches, you may need to pick one, or it may do that for you.

To get the metadata out of the files' metadata tags, I used [Mp3tag](https://docs.mp3tag.de/)'s [export](https://docs.mp3tag.de/export/) functionality with the following custom export configuration:

```
$filename(csv,utf-8)Title	Artist	Album	MBID	ISRC	ACOUSTID	Path
$loop(%_filename_ext%)%title%	%artist%	%album%	%MUSICBRAINZ_TRACKID%	%ISRC%	%ACOUSTID_ID%	%_path%
$loopend()build on %_date% with %_app%
```

That produced a TSV file that I could read using Python's `csv` module. By default Mp3tag writes UTF-8 files with a Byte Order Mark, and while it's possible to change that in Mp3tag's settings, I decided it was better to handle it on the Python side by reading the file with the `utf-8-sig` encoding so that the BOM wasn't interpreted as part of the `Title` heading. From Python I could read the MBIDs that Picard had written to my audio files and compare them to the MBIDs that were matched to my Spotify tracks.

### MusicBrainz Lookup vs. AcoustID Scan

 Picard supports a few ways of identifying tracks, but there are two that are relevant to my situation:

- If you've got the files grouped by album (I do), then Picard can look up all the tracks at once and so match them to a release (in MusicBrainz terms, an album is a type of release).
- Picard can also scan individual files to generate [AcoustID](https://acoustid.org/) fingerprints, and then look up those fingerprints in the online AcoustID database. The database maps fingerprints to MusicBrainz recording MBIDs, and contains over 19 million of those mappings.

My owned music collection consists of 4856 audio files across about 705 albums, totalling about 95 GB. I tried different ways to identify them using Picard, and checked the results using a new `mp3tag.py` Python script:

|                                  | Cluster + Lookup | Scan  | Cluster + Lookup then Scan |
| -------------------------------- | ---------------- | ----- | -------------------------- |
| Tracks                           | 14817            | 14817 | 14817                      |
| Audio files                      | 4856             | 4856  | 4856                       |
| Audio files with MBIDs           | 3402             | 4633  | 4663                       |
| Owned tracks matched using MBIDs | 1484             | 1836  | 1787                       |

This showed that AcoustID scanning gave the best results, which makes sense because an audio file's metadata can be wrong (or unexpectedly different), while the audio data is intrinsically correct (unless the file is corrupt). The AcoustID fingerprint may then be mapped to the wrong MusicBrainz recording, but that's also true of the audio file's metadata.

Weirdly, of the tracks unrecognised by AcoustID scanning, about a third of them were individual tracks from albums that had all their other tracks recognised, and I don't know why that would happen.

## Streamlining track identification

There are three main problems with the workflow using Picard and Mp3tag:

1. It's a manual process
2. It modifies the input audio files, which I don't really want to do (I want the MBIDs, I don't necessarily want any of my existing metadata overwritten)
3. It can only record one matching MBID per audio file. As I'm ultimately interested in the intersection between the Spotify track MBID and owned track MBID sets, it helps if all (correct) matches are recorded.

On that third point, you'd think that each AcoustID fingerprint would map to at most one recording MBID, though you could have multiple fingerprints mapping to the same recording, e.g. because the source audio data may be lossy. However, the [AcoustID stats page](https://acoustid.org/stats) shows that of the AcoustIDs that are mapped to a recording, 10.6% are mapped to more than one, even though that doesn't make sense. This may be a similar situation to what I found with ["The Man Who Sold The World"]({{< ref "2024-12-28-spotify-streaming-history-part-2.md#recording-data-json-dump" >}}), or maybe I'm missing something.

In any case, those are not problems inherent to using AcoustID fingerprints, just limitations due to the intended use of Picard, and Picard and Mp3tag aren't really necessary. All that's needed for the approach to work are:

1. The utility or library that is used to generate the fingerprint for a given file. That's [Chromaprint](https://acoustid.org/chromaprint), and it's available as an `fpcalc` CLI utility or a C library.
2. Access to the AcoustID database that contains the mappings from fingerprints to recording MBIDs.

While AcoustID does [provide database dumps](https://acoustid.org/database), they're in the form of daily updates, so getting a full DB dump involves downloading a lot of different files and then merging them all. Rather than doing that, AcoustID also provides a [web API](https://acoustid.org/webservice) that registered applications can use to query the hosted DB. Registering an application was simple, though the site does use need you to sign in with an OpenID provider to register an application: a Google or MusicBrainz account will do.

Luckily for me, the [pyacoustid](https://pypi.python.org/pypi/pyacoustid) Python library provides a wrapper around Chromaprint and the AcoustID web API.

I wrote `acoustid-fingerprint.py` and `acoustid-match.py` Python scripts to iterate over my music collection and use `pyacoustid` to get the matching MBIDs for my files' AcoustID fingerprints. The scripts also write out a list of files that they couldn't fingerprint or that couldn't be matched to an MBID.

I then updated my `check-mapping.py` script to cover owned tracks and it gave the following results:

| Metric                 | Tracks | Streams | Cumulative time / ms |
| ---------------------- | ------ | ------- | -------------------- |
| Total                  | 14817  | 229916  | 26646589561          |
| of tracks              | 14817  | 227024  | 21204367355          |
| with ISRCs             | 14671  | 226776  | 21170704010          |
| with MBIDs             | 12333  | 213636  | 19862629506          |
| with tags              | 7467   | 171995  | 15745707989          |
| with acoustic metadata | 10265  | 203509  | 18646230981          |
| of owned tracks        | 1982   |  99638  |  8265481039          |

From previous efforts to manually keep track of tracks I own and also have in my Spotify library, I know that I own about 1200 of the 1930 tracks that are in my Liked Songs playlist on Spotify, and only 6 of the files that my scripts couldn't match were tracks that I recognised from my Liked Songs playlist, so that seems like a very good result!

My `acoustid-match.py` script records all matches it finds for each track, so I compared its output with the MBIDs found by MusicBrainz lookup in Picard. Ideally the lookup MBID for a file would be one of the MBIDs matched by AcoustID fingerprint.

- 416 files had an MBID found by lookup that wasn't found by AcoustID matching
- 67 files had an MBID found by lookup but weren't recognised by AcoustID
- 1 file could not be processed by `acoustid-fingerprint.py` (it turned out to be very corrupt and it was a from a CD had become too scratched to successfully re-rip).

However, none of the MBIDs found only by lookup were matched to Spotify tracks, so it didn't matter that they weren't found by AcoustID matching.
