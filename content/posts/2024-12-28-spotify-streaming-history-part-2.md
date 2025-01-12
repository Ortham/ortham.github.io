---
title: Augmenting my Spotify streaming history
date: 2024-12-28
summary: Using metadata from the Spotify Web API, MusicBrainz and AcousticBrainz.
---

*This is part two of a series of posts on my Spotify extended streaming history, and follows the first part, {{< titleref "2024-12-21-spotify-streaming-history-part-1" >}}.*

The Spotify extended streaming history dataset is relatively rich, but there are questions it can't answer, such as:

- how long are tracks that I've never listened to completely (i.e. tracks for which there is no stream with `"reason_end": "trackdone"`)?
- to what extent do I listed to complete albums vs. a subset of an album's tracks?
- how old is my taste in music, i.e. when were the tracks I listen to released?
- similarly, for music released since I started using Spotify, how long is the time between its release and my first listen?
- what genres of music to I tend to listen to?
- are there any obvious preferences or trends relating to things like BPM, mood, instrumental vs. vocal, and male vs. female vocals?
- how much of the music I listen to do I own outside of Spotify (i.e. on CD or as digital downloads)?

Those questions can only be answered by augmenting my Spotify streaming history dataset with additional data from other sources.

## Additional data sources

Spotify provides a [web API](https://developer.spotify.com/documentation/web-api/reference/get-several-tracks) that can be used to get information about tracks given their Spotify IDs, and that data (omitting some fields for brevity) looks like this:

```json
{
  "album": {
    "album_type": "album",
    "artists": [
      {
        "name": "Jeremy Soule",
        "type": "artist",
        "uri": "spotify:artist:77yY2QmM6bYvjJ3y5L2R0v"
      }
    ],
    "name": "The Elder Scrolls V: Skyrim: Original Game Soundtrack",
    "release_date": "2013-01-31",
    "release_date_precision": "day",
    "total_tracks": 53,
    "uri": "spotify:album:25r7pEf31viAbsoVHC6bQ4"
  },
  "artists": [
    {
      "name": "Jeremy Soule",
      "uri": "spotify:artist:77yY2QmM6bYvjJ3y5L2R0v"
    }
  ],
  "disc_number": 1,
  "duration_ms": 237794,
  "explicit": false,
  "external_ids": {
    "isrc": "QMTH31100034"
  },
  "is_local": false,
  "name": "Dawn",
  "popularity": 55,
  "track_number": 14,
  "uri": "spotify:track:63zmiYZRPVSRLoYXbqfLPv"
}
```

A lot of this is self-explanatory, but `popularity` is an interesting one that I hadn't thought of. It's rated out of 100, measured across the entire Spotify library, and is weighted in favour of newer releases.

I wrote a `spotify-tracks.py` Python script to query the Spotify web API for each unique track URI in my streaming history and write the JSON response bodies to a file, resulting in 70 MB of pretty-printed JSON to supplement my streaming history data.

Unfortunately Spotify doesn't associate tracks or albums with genres: they're only associated with artists. Even more unfortunately, while Spotify has a web API endpoint to get "audio features" such as mood, it was deprecated and blocked for new API users (with no notice) less than a week before I started playing around with my listening history. The stated aim was "creating a more secure platform", but that seems to mean "secure" as in "securing our revenue stream by preventing third parties from building things like recommendation engines using the data that we've collected". Whatever the real reason, it's a shame that one of the most comprehensive sources of that sort of data has decided to block access to it, though it's understandable in the age of companies building AI training datasets by appropriating data from everyone they can.

Fortunately, one of the fields that Spotify's tracks API returns is `external_ids`, which is an object that may optionally have an `isrc` field. An [ISRC](https://isrc.ifpi.org/en/) is an ID that the music industry uses to uniquely identify recordings. Of the 14817 tracks in my listening history, 14671 had ISRCs and 13036 had unique ISRCs. If I could find an alternative dataset that could be queried by ISRC, then I could (in theory) reliably get the data I'm interested in without having to worry about having to match potentially inconsistent or duplicate name strings.

I had a look online for other sources of metadata that I could query by ISRC, and there were a few:

- [Soundcharts](https://soundcharts.com/) provides similar data to Spotify, but it doesn't offer API access to individuals.
- 7-digital provides an [API with genre metadata](https://docs.7digital.com/reference/details-1), and they've got a [beta API for audio features](https://docs.7digital.com/reference/enhanced-metadata-by-isrc), but you need to contact them to become a partner.
- [MusicBrainz](https://musicbrainz.org/) provides an open-access API and dataset downloads that includes genres for recordings.
- [AcousticBrainz](https://acousticbrainz.org/) is a sister project to MusicBrainz that provides audio metadata through an open-access API and dataset downloads. It can't be queried by ISRC, but it can be queried by MusicBrainz recording ID. While AcousticBrainz was discontinued in 2022 (so doesn't have data for newer releases), its data and APIs are still available.

I also checked other music streaming services such as [Apple Music](https://developer.apple.com/documentation/applemusicapi), [Tidal](https://developer.tidal.com/documentation) and [Deezer](https://developers.deezer.com/api), but their APIs weren't of use to me. In Deezer's case the API docs aren't even viewable until after you've signed up for an account and logged in, which is ridiculous, so I didn't bother. I was surprised that YouTube Music doesn't provide an official web API.

## MusicBrainz

My aim was to match each Spotify track to a MusicBrainz recording. The recording IDs (MBIDs) would then be used to retrieve the genres that MusicBrainz had associated with that recording and the acoustic metadata that AcousticBrainz had for that recording (if any).

### Recording data JSON dump

The MusicBrainz API is [rate-limited](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting) to about 1 request per second, and I've got 13036 ISRCs to look up, so instead I downloaded [a dump](https://metabrainz.org/datasets/download) of all their recording data as [JSONL](https://jsonlines.org/).

Unfortunately it turned out that the dump only contained 130130 recordings, and only 8140 ISRCs, making it very incomplete, and I've got no idea why. I tried matching on it anyway, but only got 5 matches, and only one of those was a track that I recognised.

That track had the Spotify URI `spotify:track:4mWahKerLaVddUjb8d1Q4Q` and the ISRC `USJT11500099`. It's "The Man Who Sold The World" by David Bowie, and looking at its data revealed a problem that's common when mixing datasets. While Spotify had it as a track in the album [The Man Who Sold the World (2015 Remaster)](https://open.spotify.com/album/4h9rWFWhgCSSrvIEQ0YhYG), the MusicBrainz dump had it as a [live recording](https://musicbrainz.org/recording/5e6e08da-c77d-4bf7-a642-4d03b70a8156) recorded at a theatre in Dublin in 2003. The Spotify track is definitely *not* a live recording.

This discrepancy is probably because MusicBrainz is community-maintained, so anyone can submit data that is not necessarily correct. In this case, part of the problem was that I was looking at a partial dataset: [searching MusicBrainz online](https://musicbrainz.org/isrc/USJT11500099) shows that there is a [second recording](https://musicbrainz.org/recording/d0c234bd-cfdc-4f73-a19f-67c4be0dc071) associated with that ISRC, and that second recording is a studio recording that MusicBrainz has associated with the same album as Spotify.

I think that strictly speaking there should be a many-to-one mapping from Spotify tracks to MusicBrainz recordings, but as we'll continue to see, it's actually a many-to-many mapping.

It's hard to judge the impact of incorrectly-mapped ISRCs: for recording genres it probably doesn't matter, because as long as it's a recording of the right track by the right artist, then the genre is almost certainly going to be the same. However, the audio/acoustic properties of a live performance might be quite different to a studio recording.

### Database dump

Since using the JSONL dump wasn't viable, I downloaded MusicBrainz's PostgreSQL database dump for 2024-12-12, which was 6 GB compressed and 22 GB uncompressed. I set up a local MusicBrainz server using their [musicbrainz-docker](https://github.com/metabrainz/musicbrainz-docker) repository using that downloaded dump (and Podman instead of Docker). When I queried the data using `psql` I found that it contained 4.1 million ISRCs and 33.8 million recordings, which is much more like it!

It is worth noting that Spotify's library has upwards of 100 million tracks, though as [we've seen]({{< ref "2024-12-21-spotify-streaming-history-part-1#tracks-albums-and-uris" >}}), multiple tracks can be the same recorded piece of music.

### Matching by ISRC

ISRCs are 12-character uppercase alphanumeric codes, but 172 of the Spotify tracks I'd gotten ISRCs for were not uppercase. All the ISRCs in the MusicBrainz DB were in uppercase, so the Spotify ISRCs needed to be uppercased before matching. Matching was done using a `musicbrainz-ids.py` Python script that queried the MusicBrainz database running in Podman using the following SQL for each ISRC extracted from the Spotify tracks' downloaded metadata:

```sql
select gid from recording r
    join isrc i on i.recording = r.id
    where i.isrc = ?;
```

That resulted in 10036 Spotify tracks being matched to 11377 recordings (9384 of them unique), leaving 4781 tracks unmatched. I wrote a `check-mapping.py` script to check how that affects the number of streams and the total streaming duration, and it gave the following results:

| Metric                 | Tracks | Streams | Cumulative time / ms |
| ---------------------- | ------ | ------- | -------------------- |
| Total                  | 14817  | 229916  | 26646589561          |
| of tracks              | 14817  | 227024  | 21204367355          |
| with ISRCs             | 14671  | 226776  | 21170704010          |
| with MBIDs             | 10036  | 194871  | 18083793495          |

The large drop between total cumulative time and cumulative time of tracks is because the remainder of the time was spent listening to podcast episodes, which I'm not interested in analysing.

Those numbers show that 32% of tracks couldn't be matched to MusicBrainz recordings, which isn't a great start, though those tracks only account for 15% of streaming time. Still, the MBIDs are not interesting in their own right: they're only a stepping stone to genre and acoustic metadata, so let's see how that goes.

### Looking up genres

MusicBrainz stores genres as tags that are associated with a recording in a many-to-many mapping. Tags are arbitrary strings, and not all tags are recognised as genres by MusicBrainz.

I had a look through the list of non-recognised-genre tags for the recording MBIDs that I had, and while there were a lot of values that looked like they could be genres, and a lot of tags characterising the music (e.g. `relaxed`), there were also some tags that were URLs, or things like `rap hip hop_rap_rap hip hop_rap_hip-hop`.

I wasn't sure whether to include all tags or not, as they make the dataset messier and less consistent, but do provide additional information. I ended up going with a query that would include the genre ID as a way to distinguish recognised-genre tags from other tags, and leave the decision for later. The query I used was:

```sql
select tag.name, rt.count, genre.gid as genre_id
    from recording r
    join recording_tag rt on r.id = rt.recording
    join tag on rt.tag = tag.id
    left join genre on genre.name = tag.name
    where r.gid = ?;
```

When fed the 9384 unique recording MBIDs that were matched using ISRCs, that found 473 unique genres and 1391 other unique tags for 5427 of those recordings. In terms of tracks, streams and durations:

| Metric                 | Tracks | Streams | Cumulative time / ms |
| ---------------------- | ------ | ------- | -------------------- |
| Total                  | 14817  | 229916  | 26646589561          |
| of tracks              | 14817  | 227024  | 21204367355          |
| with ISRCs             | 14671  | 226776  | 21170704010          |
| with MBIDs             | 10036  | 194871  | 18083793495          |
| with tags              | 6562   | 162573  | 14740583178          |

The hit rate went from not great to bad, with only 65% of the MusicBrainz recordings having tags, so less than half of my Spotify tracks have tags.

## AcousticBrainz

AcousticBrainz splits its metadata into high-level and low-level data, and the the acoustic metadata that I'm interested in is unfortunately a mix of both.

Like MusicBrainz, the AcousticBrainz is rate-limited to around 1 request per second. Unlike the MusicBrainz API:

- although I need to make two separate API requests to get the high-level and low-level data, there are endpoints that let me query in batches of up to 25 recordings at a time
- when you get rate-limited, the AcousticBrainz API responds with 429 and a `X-RateLimit-Reset-In` header (that can be used like `Retry-After`), so it's easy to correctly rate-limit requests.

The AcousticBrainz data dump is also available for download, but it's huge: when compressed, it's ~ 38 GB for the high-level data and ~ 590 GB for the low-level data. There are ~ 3 GB of compressed CSVs available that contain a subset of the low-level data, and they might be enough for the low-level data I'm interested in, but I decided to go for the API to start with, as at 1 request per second it would only take about 13 minutes to retrieve all the data I needed.

I wrote an `acousticbrainz.py` Python script to fetch the high-level and low-level data for a given set of recording MBIDs and dump it to a JSON file (writing out after every request in case the script encountered an error). In practice only a few of the requests hit the rate limit, and I just left it to run for maybe 20 minutes.

There's a lot of data in the API responses, and though I wasn't interested in all of it, I saved it all so that I wouldn't need to hit the API again if I changed my mind about which bits I was interested in. I also wrote a mapper function into the script to also transform the response data into objects that looked like this:

```json
{
  "247a0ded-40d4-4368-96a1-3e9c0d7e3026": {
    "high_level": {
      "is_danceable": false,
      "gender": "male",
      "is_acoustic": false,
      "is_aggressive": false,
      "is_electronic": false,
      "is_happy": true,
      "is_party": false,
      "is_relaxed": false,
      "is_sad": false,
      "timbre": "bright",
      "is_tonal": true,
      "is_instrumental": false
    },
    "low_level": {
      "rhythm": {
        "bpm": 144.14239502
      },
      "tonal": {
        "chords_key": "G",
        "chords_scale": "major",
        "key_key": "G",
        "key_scale": "major"
      }
    }
  }
}
```

The script could then be given a JSON file containing a list of raw API response bodies and it would map those bodies into those smaller objects and write the result to a different JSON file.

Checking the mapping again, that gave:

| Metric                 | Tracks | Streams | Cumulative time / ms |
| ---------------------- | ------ | ------- | -------------------- |
| Total                  | 14817  | 229916  | 26646589561          |
| of tracks              | 14817  | 227024  | 21204367355          |
| with ISRCs             | 14671  | 226776  | 21170704010          |
| with MBIDs             | 10036  | 194871  | 18083793495          |
| with tags              | 6562   | 162573  | 14740583178          |
| with acoustic metadata | 8607   | 187778  | 17241014761          |

86% of tracks that were matched to MusicBrainz recordings had acoustic metadata, which seems quite good considering the results I'd gotten so far. At this point I decided to try improving the match rate going from Spotify tracks to MusicBrainz recordings.
