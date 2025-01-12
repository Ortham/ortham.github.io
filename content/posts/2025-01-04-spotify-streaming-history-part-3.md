---
title: Matching Spotify tracks to MusicBrainz recordings
date: 2025-01-04
summary: Going beyond ISRCs to improve the match rate.
---

*This is part three of a series of posts on my Spotify extended streaming history that started with {{< titleref "2024-12-21-spotify-streaming-history-part-1" >}}, and follows the second part, {{< titleref "2024-12-28-spotify-streaming-history-part-2" >}}.*

## Improving the Spotify to MusicBrainz match rate

At [the end of my previous post]({{< ref "2024-12-28-spotify-streaming-history-part-2.md#acousticbrainz" >}}) I was left with the following statistics after trying to match Spotify tracks to their tags and acoustic metadata using Spotify track and MusicBrainz recording ISRCs.

| Metric                 | Tracks | Streams | Cumulative time / ms |
| ---------------------- | ------ | ------- | -------------------- |
| Total                  | 14817  | 229916  | 26646589561          |
| of tracks              | 14817  | 227024  | 21204367355          |
| with ISRCs             | 14671  | 226776  | 21170704010          |
| with MBIDs             | 10036  | 194871  | 18083793495          |
| with tags              | 6562   | 162573  | 14740583178          |
| with acoustic metadata | 8607   | 187778  | 17241014761          |

The first thing I did was update my `musicbrainz-ids.py` matching script to also write out the list of unmatched Spotify track URIs, so that I could feed them back in as input to the script.

Since I couldn't match those tracks using ISRCs, I need to use other metadata. The most obvious are the track name, artist name and album name. To keep things simple, I only used the track name and artist name: the track name alone is not enough, as many completely unrelated pieces of music share the same name. My reasoning for not also using the album name was that we've [already seen]({{< ref "2024-12-28-spotify-streaming-history-part-2.md#recording-data-json-dump" >}}) that MusicBrainz can have ISRCs matched against the wrong recording of the right track by the right artist, so matching on track and artist should be enough to obtain a similar level of accuracy.

Tracks and recordings can both have multiple artists, so I considered the artists to match if those sets intersected, as I thought it was likely that Spotify and MusicBrainz would list intersecting but unequal sets of artists for the same recording. I started off with a simple equality comparison between the Spotify and MusicBrainz track name and artist names, using the following query (looping over tracks' artists in Python):

```sql
select gid from recording r
    join artist_credit_name acn on r.artist_credit = acn.artist_credit
    where r.name = ? and acn.name = ?;
```

`gid` here is the recording's MBID. Of 4781 input tracks, 2010 tracks were matched to 8172 recordings (7105 unique), leaving 2771 unmatched tracks.

Looking through some of the data, I noticed that some tracks and artists in MusicBrainz differed only by case, so I adjusted the query to:

```sql
select gid from recording r
    join artist_credit_name acn on r.artist_credit = acn.artist_credit
    where lower(r.name) = lower(?) and lower(acn.name) = lower(?);
```

That was a mistake, because the lowercased recording and artist names are not indexed, and the query took hours to run before I gave up and cancelled it.

I added a couple of indexes to the MusicBrainz database running in Podman and tried again:

```sql
create index if not exists recording_lower_name
    on recording (lower(name));

create index if not exists artist_credit_name_lower_name
    on artist_credit_name (lower(name));
```

This time it took 9 minutes 40 seconds to run (compared to 5 seconds with case-sensitive comparisons), and it matched 2297 tracks to 9999 recordings (8493 unique), leaving 2484 unmatched tracks. That meant only 287 additional tracks got matched.

The indexes didn't help as much as I expected, so I took a look at the query plans for the two queries and they look quite different:

```
musicbrainz_db=# explain select gid from recording r join artist_credit_name acn on r.artist_credit = acn.artist_credit where r.name = 'Broken English'
and acn.name = 'SCHAFT';
                                                 QUERY PLAN
-------------------------------------------------------------------------------------------------------------
 Nested Loop  (cost=5.76..1640.57 rows=1 width=16)
   ->  Bitmap Heap Scan on recording r  (cost=5.33..398.11 rows=99 width=20)
         Recheck Cond: ((name)::text = 'Broken English'::text)
         ->  Bitmap Index Scan on recording_idx_name  (cost=0.00..5.31 rows=99 width=0)
               Index Cond: ((name)::text = 'Broken English'::text)
   ->  Index Scan using artist_credit_name_pkey on artist_credit_name acn  (cost=0.43..12.54 rows=1 width=4)
         Index Cond: (artist_credit = r.artist_credit)
         Filter: ((name)::text = 'SCHAFT'::text)
(8 rows)
```

While I'm no expert at interpreting Postgres query plans, this looks about what I expected: I can see that the indexes that the MusicBrainz DB dump came with are being used, and that there are two independent scans happening for the two `where` conditions in the query.

Without my additional indexes, the case-insensitive query plan is:

```
musicbrainz_db=# explain select gid from recording r join artist_credit_name acn on r.artist_credit = acn.artist_credit where lower(r.name) = lower('Broken English') and lower(acn.name) = lower('SCHAFT');
                                               QUERY PLAN
---------------------------------------------------------------------------------------------------------
 Gather  (cost=77893.77..729905.68 rows=2782 width=16)
   Workers Planned: 2
   ->  Parallel Hash Join  (cost=76893.77..728627.48 rows=1159 width=16)
         Hash Cond: (r.artist_credit = acn.artist_credit)
         ->  Parallel Seq Scan on recording r  (cost=0.00..651464.57 rows=70481 width=20)
               Filter: (lower((name)::text) = 'broken english'::text)
         ->  Parallel Hash  (cost=76746.82..76746.82 rows=11756 width=4)
               ->  Parallel Seq Scan on artist_credit_name acn  (cost=0.00..76746.82 rows=11756 width=4)
                     Filter: (lower((name)::text) = 'schaft'::text)
 JIT:
   Functions: 14
   Options: Inlining true, Optimization true, Expressions true, Deforming true
(12 rows)
```

The index scans have unsurprisingly become sequence scans. The overall structure has also changed, with a top-level gather, a hash join and parallel operations throughout, and I don't really understand why. Adding the indexes turns it into:

```
musicbrainz_db=# explain select gid from recording r join artist_credit_name acn on r.artist_credit = acn.artist_credit where lower(r.name) = lower('Broken Eng
lish') and lower(acn.name) = lower('SCHAFT');
                                                     QUERY PLAN
--------------------------------------------------------------------------------------------------------------------
 Gather  (cost=44558.25..533789.71 rows=2782 width=16)
   Workers Planned: 2
   ->  Parallel Hash Join  (cost=43558.25..532511.51 rows=1159 width=16)
         Hash Cond: (r.artist_credit = acn.artist_credit)
         ->  Parallel Bitmap Heap Scan on recording r  (cost=3575.51..492259.63 rows=70481 width=20)
               Recheck Cond: (lower((name)::text) = 'broken english'::text)
               ->  Bitmap Index Scan on recording_lower_name  (cost=0.00..3533.22 rows=169154 width=0)
                     Index Cond: (lower((name)::text) = 'broken english'::text)
         ->  Parallel Hash  (cost=39835.79..39835.79 rows=11756 width=4)
               ->  Parallel Bitmap Heap Scan on artist_credit_name acn  (cost=443.09..39835.79 rows=11756 width=4)
                     Recheck Cond: (lower((name)::text) = 'schaft'::text)
                     ->  Bitmap Index Scan on artist_credit_name_lower_name  (cost=0.00..436.04 rows=28214 width=0)
                           Index Cond: (lower((name)::text) = 'schaft'::text)
 JIT:
   Functions: 14
   Options: Inlining true, Optimization true, Expressions true, Deforming true
(16 rows)
```

I can see that the indexes that I added are being used, but the same structural changes as before are still present. I didn't investigate this any further, but it might be worth coming back to at some point: maybe there's some more optimisation that could be done.

Anyway, I updated my `musicbrainz-ids.py` script to look for name matches if no ISRC matches were found, and ran it against the full set of Spotify tracks. That took 9 minutes 44 seconds and matched 12333 tracks to 21376 recordings (17806 unique), leaving 2484 unmatched tracks.

Fetching all the AcousticBrainz data for those recordings took a while, but afterwards I checked the mappings again and got:

| Metric                 | Tracks | Streams | Cumulative time / ms |
| ---------------------- | ------ | ------- | -------------------- |
| Total                  | 14817  | 229916  | 26646589561          |
| of tracks              | 14817  | 227024  | 21204367355          |
| with ISRCs             | 14671  | 226776  | 21170704010          |
| with MBIDs             | 12333  | 213636  | 19862629506          |
| with tags              | 7305   | 169876  | 15470714213          |
| with acoustic metadata | 10139  | 202852  | 18585215730          |

That's a significant jump in MBID and AcousticBrainz matches, but comes at a disproportionate execution time cost.

## Vibes-based matching optimisation

Spending 10 minutes just matching Spotify tracks to recording MBIDs is fine for a one-off run, but when trying to improve the matching success rate it's too slow, especially as I wanted to try more complex matches (like substrings, or maybe comparisons using something like the [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance)). I decided to try moving the matching logic out of Postgres, in case that would help.

I wrote a script to dump all the recording data to a JSON file so that I could more easily read and hold the data in memory. The query used was:

```sql
select isrc, gid, r.name, acn.name from recording r
  left join isrc i on i.recording = r.id
  join artist_credit_name acn on r.artist_credit = acn.artist_credit;
```

That resulted in a 4.24 GB JSON file, containing an array of ~ 40 million arrays, with each inner array representing a result row from that SQL query.

I rewrote the matching logic in Python, comparing only names and stopping at the first match for each track to keep things simple to start with. I made the script preprocess the tracks and recordings to lowercase their names (and to skip tracks with empty name strings - it turned out that there a few) ahead of the actual matching. Even with that simplified approach, the initial version was far too slow, and I terminated it after an hour had passed.

On a hunch, I quickly rewrote the script in Rust using the `clap`, `serde` and `serde_json` crates, and compared the execution times for the Python and Rust scripts when given just 100 tracks to match. I found that the Rust version was 16x faster than the Python-only script. I then ran it with all the tracks that weren't matched by ISRCs, it was 1.99x faster than the equivalent Postgres approach, which told me that it was an idea worth pursuing further.

It's worth noting that although the Python and Rust implementations used the same input data, looping logic and comparisons, the data structures were quite different, as in Python the Spotify tracks JSON was deserialised into an array of nested dicts and the recordings JSON was deserialised into an array of arrays, while in Rust both were deserialised into arrays of structs containing only the fields that I was interested in.

The Rust version was still too slow for my liking, so I started investigating. A proper attempt at optimising some code should really involve a decent benchmarking setup, things like instrumented code and tooling like flamegraphs to help you make good measurements and then identify where to focus your efforts so that you don't prematurely optimise anything.

I didn't do any of that, instead just trying out various ideas and measuring the impact using ye olde print debugging:

```rust
    let start = SystemTime::now();

    // Measured code here

    println!("Took {} ms", start.elapsed().unwrap().as_millis());
```
The code looped over the tracks, and then for each track looped over the recordings until it found a match. As such, the recording object size had a significant impact on performance:

| Recording object stack size / bytes           | Elapsed time (1000 tracks, stop on first match) / s |
| --------------------------------------------- | --------------------------------------------------- |
| 96 (all fields as strings)                    | 61                                                  |
| 72 (no ISRC)                                  | 50                                                  |
| 64 (no ISRC, MBID as u128)                    | 46                                                  |
| 56 (no ISRC, MBID replaced by a 32-bit index) | 44                                                  |
| 48 (no ISRC or MBID - not viable)             | 39                                                  |

The string data was stored on the heap, so isn't included in the above sizes.

The performance being inversely proportional to the size of the recording objects was expected, as the matching logic loops over all the recordings for each track, so the more you can fit in the same amount of memory, the more can be fetched from RAM at a time. I settled on the 64-byte recording objects as they were smaller but still easy to work with.

At this point I switched over to finding all matching recordings per track, instead of just the first match per track (but still ignoring ISRCs for now). That obviously reduced performance, taking ~ 48% longer with 1000 tracks.

Finding all matches meant that I was now comparing every recording against every track, and thinking about caches made me realise that I was running the loops the wrong way around. Ideally the inner loop could be executed by the CPU without having to stop and fetch any data from RAM, but the recording objects' stack size alone comes to ~ 2.4 GB! However, while each track object is larger (at 96 bytes), there's a far smaller number of them, and the total stack size for 14817 tracks is ~ 1.36 MB. While that's still larger than my CPU's L2 cache, it's well within its L3 cache.

I swapped the loops so that the code would loop over each track for each recording, and that resulted in a 4.35x performance improvement.

At that point I also realised that I'd been storing the album name in case I wanted to also match against it, but wasn't actually using it. I removed it, but found that the performance difference was negligible.

I also tried replacing the nested for loops with a couple of flattened iterators, which turned out to have about the same performance. I decided to stick with the for loops as it's more readable.

### Introducing parallelism

At this point I tried to split the workload over multiple threads. I started by using the `rayon` crate, since it provides an extremely easy way to split iterable work across threads. I found that how I used Rayon made a big difference to the performance I saw:

- The best performance (8.25x single-threaded) was when I used Rayon's `.par_iter()` on the outer loop over the recordings, together with an inner for loop over the tracks that pushed to a `Vec`.
- The next best performance (4.62x single-threaded) was when using Rayon's `.par_iter()` on the outer loop over the recordings, together with an inner iterator over the tracks that collected into a `Vec`. My guess is that there's some compiler optimisation that is being missed with that approach, because this and the for loop approach look like they should do the same thing.
- Then (1.43x single-threaded) was when using Rayon's `.par_iter()` on the outer and inner loops. This avoided the need to collect the inner loop into a `Vec`, but obviously that wasn't worth the cost of the inner parallel iteration.
- The first approach to be slower than single-threaded matching (at 0.19x single-threaded) was using Rayon for both loops but swapping the loops so that recordings were iterated over for each track.
- Then (0.17x single-threaded) came the same approach as the first (the fastest approach), but with the loops swapped.
- Finally, using a for loop for the outer recordings loop and Rayon's `.par_iter()` for the inner tracks loop gave the worst performance, at a whopping 0.02x single-threaded. That's not surprising as it means that each item of work being distributed is only a single comparison between a track and a recording, so the distribution overhead dominates.

Rayon uses a work-stealing approach that's very flexible, but I thought it might be overkill for this case where I know how many work items there are and that all the work items take roughly the same amount of time, so I replaced it with the following function:

```rust
fn execute_par<'a, T: Sync, O: Clone + Send>(
    items: &'a [T],
    function: impl Fn(&'a [T]) -> Vec<O> + Send + Copy,
) -> Vec<O> {
    let num_threads = usize::from(std::thread::available_parallelism().unwrap());

    // +1 because the division truncates.
    let items_per_thread = (items.len() / num_threads) + 1;

    let iter = items.chunks(items_per_thread);

    // Collect into this to retain total order.
    let mut thread_results = vec![Vec::new(); num_threads];

    let (sender, receiver) = std::sync::mpsc::channel();

    std::thread::scope(|s| {
        for i in 0..num_threads {
            if let Some(chunk) = iter.next() {
                let sender = sender.clone();

                s.spawn(move || {
                    let matches = function(chunk);

                    sender.send((i, matches)).unwrap();
                });
            }
        }

        for _ in 0..num_threads {
            let (i, results) = receiver.recv().unwrap();
            thread_results[i] = results;
        }
    });

    thread_results.into_iter().flatten().collect()
}

// Used like this.
fn find_matches_par<'a, 'b>(
    recordings: &'a [RecordingIsrcArtist],
    tracks: &'b [SpotifyTrack],
) -> Vec<(&'b str, &'a Mbid)> {
    execute_par(recordings, |recs_chunk| find_matches(recs_chunk, tracks))
}
```

That matched Rayon's performance, so I removed the Rayon dependency.


I also investigated the effect of SMT on performance. My CPU has 8 cores and SMT, and when running on 8 threads the code was 5.25% faster than on one thread, while when running on 16 threads it was 8.25% faster. These numbers suggest some scaling inefficiency, as ideally when running 8 threads on 8 cores it would be 8x faster than a single thread. SMT giving 57% more performance is a lot better than the ~ 25% I was expecting, so maybe the threads spend a lot of time waiting, giving lots of opportunity for each core's second thread to jump in?

There no doubt is some inefficiency, but throwing a spanner in the works is the fact that my CPU thermally throttles when four or more cores are under load (it's an AMD 9800X3D running under a Noctua NH-L9a, so that's not surprising). My single-thread boost clock speed is about 5.2 GHz, while during matching the CPU cores sat at 4.0 GHz. That suggests that ideally I'd be getting a performance improvement of a little over 6x with 8 threads.

I'm not sure how I could improve the multi-thread scaling. I know the L3 cache is shared between cores, so maybe there's some contention between the cores fetching different data and so invalidating the cache and stalling each other? I also thought that since I'm essentially looking for duplicate strings, interning the strings and comparing their keys might also help performance in general, though that wouldn't work for anything other than simple string equality comparisons. I didn't investigate further, but it's maybe something to go back to.

### Reintroducing ISRC comparisons

At this point I reintroduced ISRC-based matching. At this point the Rust script's behaviour diverges from the Postgres approach: because I swapped the recordings and tracks loops, the Rust script can't stop at the first match per track, so instead of matching on ISRC and falling back to name matching if ISRC matching is unsuccessful, it always tries both. I could have changed the implementation to try ISRCs for all tracks and then try names for all remaining unmatched tracks, but I wanted to always try both anyway.

Matching on ISRCs meant storing the ISRC values in the recording and track objects, making them a little larger. Adding the fields didn't affect performance, but checking them during matching caused the code to run 2.25x slower.

At first glance it's not obvious why comparing ISRCs has such a big performance hit, given that the track names are also always compared, and both ISRCs and names were stored as `String`s. I think one of the big reasons that comparing the track names first was faster because the lengths of those strings are very often different, and the lengths are stored on the stack, so spotting unequal lengths is quick. However, because ISRCs are always 12 bytes long, comparing their strings would always involve heap access. With that in mind, deserialising the ISRCs to a fixed-length byte array stored on the stack instead of to a string reduced the performance hit to 1.8x slower.

Going further with that logic, the format of ISRC values may also play a role: the format is `CCXXXYYNNNNN`, where:

- `CCXXX` is a prefix code, assigned to a particular ISRC issuer (e.g. a record label). Previous versions of the standard had this as two separate fields, where `CC` was a country code and `XXX` was a code representing the issuer.
- `YY` is the year of reference, i.e. the last two digits of the year that the ISRC was assigned
- `NNNNN` is the designation code, an ID assigned by the issuer within the range of values that they have been allocated. All IDs assigned by an issuer must be unique within the same year of reference.

This structure suggests that when comparing two ISRCs byte-by-byte, the first few bytes are more likely to match than later bytes. The more bytes you need to compare before spotting an inequality, the longer it takes, so ideally you want your most uniformly distributed values compared first. A common approach when dealing with sort-friendly IDs like this is to compare the values' bytes in reverse order, but in this case it's practical to achieve better results by hashing the ISRCs and comparing the hashes, as they are more likely to have byte values that are uniformly distributed.

With all that said, I tried comparing both reversed and hashed ISRCs, and saw no noticeable difference in performance compared to comparing the original ISRCs. I think my logic is sound, so I think this is a case of premature optimisation, where the improvement is invisible due to something else bottlenecking performance.

### Merging recordings

One of the last optimisations that I tried was to merge recording objects with the same MBID: in the input data, each combination of (MBID, ISRC, track name, artist name) was its own object, whereas as we've seen there can be multiple artists and ISRCs.

Merging the recording objects like this was initially 16% slower, but then I changed the ISRC comparison from this:

```rust
if let Some(isrc) = track.external_ids.isrc {
    if recording.isrcs.contains(&isrc) {
        return true;
    }
}
```

to this:

```rust
if !recording.isrcs.is_empty() {
    if let Some(isrc) = track.external_ids.isrc {
        if recording.isrcs.contains(&isrc) {
            return true;
        }
    }
}
```

and that ended up being 10% faster than with un-merged recording objects.

However, doing all this merging meant that preparing the data took longer, and that increase outweighed the time saved during matching. I tried parallelising the data preparation, but the new merging didn't parallelise very well: after merging has happened on each worker thread it needs to happen on the main thread to merge duplicates that were sent to different workers, and the number of merged recordings is only 15% smaller than the original number, so the main thread has to re-do most of the work anyway.

As a result, it still ended up fastest overall to parallelise the unmerged recording data preparation, as that made it 3x faster than serial data preparation without affecting matching performance, gaving a 5% improvement on the overall loading, preparation and matching time.

### Revisiting the Python approach

At this point I wanted to go back to the matching that I'd implemented in Python without Postgres and see if I could apply similar optimisations. At this point I'd gotten the Rust script to be tens of times faster than the Python script, so I wasn't expecting a miracle, but was curious about what kind of improvement I could make.

1. I started by swapping the loops like I had for Rust, so that the inner loop was over tracks, and found that gave a 34% improvement.
2. I next stored only the track data that I needed in a named tuple instead of storing all the track data as a nested dict, and flattened data structures as much as possible (e.g. `track['external_ids']['isrc']` became `track[1]`, and the array of artist objects became an array of artist name strings). That gave a 13% improvement.
3. I then switched from named tuples to normal tuples, and that gave a 15% improvement.
4. I stored the ISRCs as `bytes` objects instead of `str` objects, which didn't really change performance but was a closer match to what the Rust code was doing.
5. I tried to store the MBID values using Python's `UUID` type, since that can represent them as 16 bytes instead of 36 bytes and doing the same in Rust had a positive impact, but that was actually 5% slower. I also tried storing `UUID(mbid).int` values, but that was 3% slower (which could well be within measurement uncertainty), so I reverted the change.
6. I merged the recordings as I had tried in the Rust script. That was 29% slower, so I reverted the change.

That all meant I'd managed a 2x performance improvement, and at that point I tried introducing some parallelism. I can't remember doing any parallelism in Python before, but I knew the GIL meant that I'd need multiprocessing instead of multithreading since I was going to be processing a lot of data in Python itself (and not in some Python code that actually drops into a faster language like C).

1. I tried using `concurrent.futures.ProcessPoolExecutor`, but that didn't really help much, because while it allows you to set the maximum number of processes, it doesn't necessarily mean that all that capacity would be used. I found that despite splitting the recordings into 16 similarly-sized chunks, only a couple of processes were used. I did see the load get distributed across more cores as I increased the number of tracks from my initial small sample size, but it seemed like the sophistication of the system got in the way of just getting the work done faster. I can see the executor being useful for parallel execution of unpredictable workloads (e.g. in a web server), but it doesn't seem like a good fit for a known-size easily-divisible workload.
2. I then tried using `multiprocessing.Pool`, but ran into exceptions when it tried to retrieve the results. I wasn't able to figure out what was going wrong in a short amount of time, so I just moved on.
3. My last attempt was to take a similar approach to what I'd done in Rust using `multiprocessing.Process` and `multiprocessing.Queue` to spin up 16 processes and combine the results using a queue. That worked as expected, and I saw all cores under load, though I did notice that they each had a few seconds of ramp-up time before they hit their maximum load.

I saw a 7.2x performance improvement as a result of multiprocessing, though it also increased memory usage from 22 GB to 35 GB due to having to copy slices of the input data across 16 processes.

Something that initially surprised me when benchmarking the multiprocess Python code was that its scaling efficiency increased with the number of tracks being processed for a lot longer than the Rust code did. My reasoning is that with a relatively small number of tracks the overhead of parallel processing is probably more significant, while with a relatively large number of tracks there's probably more cache contention, and in the middle there's a balancing point between the two that maximises the scaling efficiency. I guess that because the Python code uses multiprocessing and the Rust code uses multithreading, the overhead is higher for the Python code so takes more tracks to overcome?

Here's the raw data:

| Track Count | Serial Python / ms | Parallel Python / ms | (Serial / Parallel) Python | Serial Rust / ms | Parallel Rust / ms | (Serial / Parallel) Rust |
| ----------- | ------------------ | -------------------- | -------------------------- | ---------------- | ------------------ | ------------------------ |
| 100         | 139045             | 39965                | 3.48                       | 2843             | 357                | 7.96                     |
| 300         | 419775             | 75956                | 5.53                       | 7960             | 948                | 8.40                     |
| 900         | 1269139            | 200280               | 6.34                       | 23119            | 2977               | 7.77                     |
| 2700        | 3968170            | 549747               | 7.22                       | 67333            | 8915               | 7.55                     |
| 8100        |                    |                      |                            | 206866           | 27444              | 7.54                     |

It looks like that 7.2x improvement for Python might not be its maximum, but it took too long to benchmark the serial Python code with any larger track counts.

### Performance optimisation results

To compare like-for-like, I adjusted the Postgres script to match on both ISRC and names for all tracks, and also benchmarked it.

| Matching approach                                    | Time taken / s  | Matched tracks | Matched recordings | Unique matched recordings |
| ---------------------------------------------------- | --------------- | -------------- | ------------------ | ------------------------- |
| ISRC-only (Postgres)                                 | 5               | 10036          | 11377              | 9384                      |
| ISRC with case-insensitive names fallback (Postgres) | 584             | 12333          | 21376              | 17806                     |
| ISRC or case-insensitive names (Postgres)            | 1713            | 12333          | 95090              | 74306                     |
| ISRC or case-insensitive names (Rust)                | 86 (21 + 2 +63)      | 12333          | 95095              | 74309                     |
| ISRC or case-insensitive names (Python)              | 3172 (17 + 17 + 3138) | 12333          | 95095              | 74309                     |

The sums for the Python and Rust scripts are loading + preparation + matching breakdowns. The Rust version is over 20x faster than Postgres and 37x faster than Python, and uses 11 GB of RAM vs Python's 35 GB.

It's worth noting that the Python/Rust script matched a few more recordings than the Postgres version. That could be down to different lowercasing behaviour, with Postgres perhaps treating certain characters differently.

As expected, the matched tracks count didn't change, but the number of unique recordings they've matched has more than quadrupled, so there should be a much better chance of finding metadata for those recordings. However, I didn't want to hammer the AcousticBrainz API fetching so much data, so that meant I needed to adjust my approach for getting that data.

## Revisiting AcousticBrainz

As [previously mentioned]({{< ref "2024-12-28-spotify-streaming-history-part-2.md#acousticbrainz" >}}), the AcousticBrainz dataset is split into high-level data and low-level data. The compressed downloads for the high-level and low-level data are ~ 38 GB and ~ 590 GB respectively, and there are also ~ 3 GB of compressed CSVs available that contain a subset of the low-level data that might be enough for the low-level data I'm interested in.

I don't have the storage space for the full low-level dataset, but I do have enough space for the high-level data and low-level CSVs, so I downloaded them (in hindsight I should have just started with the CSVs). Uncompressed, the full high-level JSON dump is 290 GB, and the low-level, rhythm and tonal CSVs are 7 GB.

I was hoping that the high-level data wouldn't compress that well, because it doesn't leave me with much free space and the high-level `.tar.zst` archives are a bit awkward to work with: they hold a directory structure that looks like this:

```
acousticbrainz-highlevel-json-20220623/
  highlevel/
    00/
      0/
        000aaeed-e3b7-4890-964d-c53e1f14fbc3-0.json
        000abf35-b0f2-4985-82c9-bd3ef80e0699-0.json
        000abf35-b0f2-4985-82c9-bd3ef80e0699-1.json
        000abf35-b0f2-4985-82c9-bd3ef80e0699-2.json
        ...
      ...
    ...
```

Ideally they'd be compressed in such a way that given an MBID, I'd be able to find the offset for its JSON file(s) within the archive, seek there and read just that data. That would allow me to keep the data in its compressed form, and the ad-hoc decompression cost would probably be worth the saved disk space. Unfortunately, I don't think that's possible with the combination of tar and Zstd that was used.

Before I got too into the weeds, I performed a relatively quick check: I extracted the `acousticbrainz-lowlevel-features-20220623-lowlevel.csv` low-level CSV dump and wrote a script that would write the MBIDs in it to a file of the same format as produced by my `acousticbrainz.py` script. I then fed it into my `check-mappings.py` script to see what effect having all of AcousticBrainz' MBIDs had.

Running `check-mappings.py` with the MBIDs matched using ISRC and case-insensitive track and artist name equality, together with those MBIDs' tags and the dummy AcousticBrainz data, the results were:

| Metric                 | Tracks | Streams | Cumulative time / ms |
| ---------------------- | ------ | ------- | -------------------- |
| Total                  | 14817  | 229916  | 26646589561          |
| of tracks              | 14817  | 227024  | 21204367355          |
| with ISRCs             | 14671  | 226776  | 21170704010          |
| with MBIDs             | 12333  | 213636  | 19862629506          |
| with tags              | 7467   | 171995  | 15745707989          |
| with acoustic metadata | 10265  | 203509  | 18646230981          |

Unfortunately it looks like having 4x the recordings as matching on ISRCs with names as a fallback only lead to a 2% increase in tracks with tags and a 1% increase in tracks with acoustic metadata.

Since I had the low-level CSVs, I opened them and found that the tonal CSV didn't have the chords key or chords scale fields, which are two I'm interested in. Given that I'd need to continue to make API requests for the low-level data to get them, there wasn't much point using the CSVs for the other data.

Instead, I updated my `acousticbrainz.py` script to filter MBIDs by what's in the low-level CSV dump, so that it would only pick one MBID that has low-level data for each track, and make API requests for only those MBIDs. That filtering reduced 74309 MBIDs down to 8554.

This filtering approach avoids many AcousticBrainz API requests, but assumes that:

- All MBIDs matched for a track that have acoustic metadata have metadata that's functionally equivalent for my purposes. I don't really have a way to check that without manually verifying the MBID matches and that the acoustic metadata was generated from the correct tracks.
- An MBID that does not have low-level metadata also won't have high-level metadata. That was true for the ~ 12k MBIDs that I'd fetched acoustic metadata before introducing this filtering, so I'm comfortable making that assumption.

An alternative approach to this filtering would be to perform the AcousticBrainz API requests during the matching process, so that you can stop matching on the first match that successfully returns acoustic metadata. That would greatly reduce how many matches are checked for, but I preferred the simplicity of keeping matching separate from the API requests.

### Allowing for name prefixes and suffixes

Thinking back to what I found with ["A New Hope and End Credits"]({{< ref "2024-12-21-spotify-streaming-history-part-1#tracks-albums-and-uris" >}}), I knew there were cases where the same recording had appeared in tracks with slightly different names that wouldn't be matched using case-insensitive equality comparisons.

Out of curiosity, I updated the Rust version of my MBID matching code to compare names by checking if the names from the Spotify track were contained within the names from the MusicBrainz recording or vice versa, using checks like:

```rust
track_artist.name.contains(recording_artist_name)
    || recording_artist_name.contains(&track_artist.name)
```

That took 23 minutes 21 seconds to match 14616 tracks to 377112 recordings (163303 unique), making it 16x slower than when checking name equality and giving a ratio of 25.8 recordings per track: the ratio for matching using case-insensitive string equality is 7.7 recordings per track.

I ran my `acousticbrainz.py` script to get the acoustic metadata for the matched MBIDs, and its new filtering reduced those 163303 MBIDs to 5795. I then ran `check-mapping.py`, and the results were:

| Metric                 | Tracks | Streams | Cumulative time / ms |
| ---------------------- | ------ | ------- | -------------------- |
| Total                  | 14817  | 229916  | 26646589561          |
| of tracks              | 14817  | 227024  | 21204367355          |
| with ISRCs             | 14671  | 226776  | 21170704010          |
| with MBIDs             | 14616  | 226362  | 21141764411          |
| with tags              | 8940   | 181342  | 16698600768          |
| with acoustic metadata | 14099  | 225181  | 21009799903          |

The percentage of tracks with tags has risen from 50% to 60%, streams with tags has risen from 76% to 80%, and time with tags has risen from 74% to 79%. The percentage of tracks with acoustic metadata has risen from 69% to 95%, streams from 89% to 99%, and time from 88% to 99%.

Those seem like great results, but 25.8 recordings per track seems highly unlikely to be correct, and the fact that there were fewer filtered MBIDs than when using case-insensitive equality matching is a clear indicator that the substring-based matching gave nonsense results. I'd like to dig into why that is (did I listen to a track named "A" or anything like that?), but haven't gotten around to it.
