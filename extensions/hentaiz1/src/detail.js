load('config.js');

function parseSvelteTable(table) {
    var data = table;
    var indices = table[1]; 
    if (!indices || !Array.isArray(indices)) return [];

    function resolve(idx) { 
        return (typeof idx === 'number') ? data[idx] : idx; 
    }

    var chapters = [];
    for (var i = 0; i < indices.length; i++) {
        var item = resolve(indices[i]);
        if (item && item.slug) {
            var epSlug = resolve(item.slug);
            var epNumber = resolve(item.episodeNumber) || (i + 1);
            chapters.push({
                name: "Tập " + epNumber,
                url: BASE_URL + "/watch/" + epSlug,
                host: BASE_URL
            });
        }
    }
    return chapters.reverse();
}

function execute(url) {
    url = normalizeUrl(url);
    var slug = decodeURI(url.split('/').pop());

    // 1. Fetch HTML tĩnh siêu tốc
    var res = fetch(url, { headers: { "User-Agent": UserAgent.chrome() } });
    if (!res || !res.ok) {
        return Response.error("Không thể tải trang chi tiết phim: " + url);
    }
    var html = res.text() + "";

    var name = "";
    var description = "";
    var author = "HentaiZ";
    var genres = [];
    var episodeId = "";
    var cover = "";

    // 2. Trích xuất metadata từ SvelteKit JSON data nhúng trong HTML
    var dataArr = [];
    try {
        var startIdx = html.indexOf('data:');
        if (startIdx !== -1) {
            var bracketCount = 0;
            var started = false;
            var jsonStr = "";
            for (var i = startIdx; i < html.length; i++) {
                var char = html.charAt(i);
                if (char === '[') {
                    bracketCount++;
                    started = true;
                }
                if (started) {
                    jsonStr += char;
                }
                if (char === ']') {
                    bracketCount--;
                    if (bracketCount === 0 && started) {
                        break;
                    }
                }
            }
            if (jsonStr) {
                eval("dataArr = " + jsonStr + ";");
            }
        }
    } catch (e) {}

    var epData = null;
    if (dataArr && Array.isArray(dataArr)) {
        for (var idx = 0; idx < dataArr.length; idx++) {
            if (dataArr[idx] && dataArr[idx].data && dataArr[idx].data.episode) {
                epData = dataArr[idx].data.episode;
                break;
            }
        }
    }

    if (epData) {
        episodeId = epData.id || "";
        name = (epData.title || "").replace(/\s*-\s*Tập\s*\d+.*$/i, "").replace(/\s*Tập\s*\d+.*$/i, "").trim();
        description = (epData.description || "").replace(/<[^>]*>?/gm, '').trim();

        // Image logic: posterImage > backdropImage > thumbnailImage
        var imgObj = epData.posterImage || epData.backdropImage || epData.thumbnailImage;
        if (imgObj && imgObj.filePath) {
            cover = IMAGE_URL + imgObj.filePath;
        }

        if (epData.studios && epData.studios.length > 0 && epData.studios[0].studio) {
            author = epData.studios[0].studio.name || "HentaiZ";
        }

        if (epData.genres && epData.genres.length > 0) {
            epData.genres.forEach(function (g) {
                if (g.genre) {
                    genres.push({
                        title: g.genre.name,
                        input: BASE_URL + "/genres/" + g.genre.slug + "/__data.json?page={{page}}&x-sveltekit-invalidated=001",
                        script: "gen.js"
                    });
                }
            });
        }
    }

    // Fallback nếu không parse được qua JSON
    if (!name) {
        var doc = Html.parse(html);
        var rawName = doc.select("h2").first() ? doc.select("h2").first().text() + "" : "";
        name = rawName.replace(/\s*-\s*Tập\s*\d+.*$/i, "").replace(/\s*Tập\s*\d+.*$/i, "").trim() || slug;
        if (!description) {
            description = doc.select(".pointer-events-auto p").text() + "";
            if (!description) description = doc.select(".line-clamp-3").text() + "";
        }
        var studioEl = doc.select("a[href*='/studios/']").first();
        if (studioEl) author = studioEl.text().trim();

        if (genres.length === 0) {
            doc.select("a[href*='/genres/']").forEach(function(el) {
                var gTitle = el.text().trim();
                var gHref = el.attr("href") + "";
                if (gTitle && gHref) {
                    genres.push({
                        title: gTitle,
                        input: normalizeUrl(gHref) + "/__data.json?page={{page}}&x-sveltekit-invalidated=001",
                        script: "gen.js"
                    });
                }
            });
        }
    }

    // 3. Gọi API getSeriesEpisodes lấy TOC và bổ sung cover
    var episodesList = [];
    var hash = "1edhnia"; // hash mặc định
    var hashMatch = html.match(/\/remote\/([a-zA-Z0-9_-]+)\/getSeriesEpisodes/);
    if (hashMatch) { hash = hashMatch[1]; }

    try {
        load("crypto.js");
        var payload = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify([{ "currentSlug": 1 }, slug])));
        var apiUrl = BASE_URL + "/_app/remote/" + hash + "/getSeriesEpisodes?payload=" + encodeURIComponent(payload);

        var apiRes = fetch(apiUrl, { headers: { "User-Agent": UserAgent.android() } });
        if (apiRes && apiRes.ok) {
            var apiData = JSON.parse(apiRes.text() + "");
            var svelteData = apiData.result || apiData.data || null;

            if (svelteData) {
                // ① Bổ sung cover nếu chưa có
                if (!cover) {
                    if (svelteData.posterImage && svelteData.posterImage.filePath) {
                        cover = IMAGE_URL + svelteData.posterImage.filePath;
                    } else if (svelteData.backdropImage && svelteData.backdropImage.filePath) {
                        cover = IMAGE_URL + svelteData.backdropImage.filePath;
                    } else if (svelteData.thumbnailImage && svelteData.thumbnailImage.filePath) {
                        cover = IMAGE_URL + svelteData.thumbnailImage.filePath;
                    }
                }

                // ② Giải mã TOC
                episodesList = parseSvelteTable(svelteData);
            }
        }
    } catch (e) {}

    // Fallback cào DOM TOC nếu API rỗng
    if (episodesList.length === 0) {
        var doc = Html.parse(html);
        doc.select(".divide-y a[href*='/watch/']").forEach(function(el) {
            var epTitle = el.select("span").text() || el.text() || "";
            var epHref = el.attr("href") + "";
            if (epHref) {
                episodesList.push({
                    name: epTitle.trim(),
                    url: normalizeUrl(epHref),
                    host: BASE_URL
                });
            }
        });
    }

    if (episodesList.length === 0) {
        episodesList.push({
            name: "Xem phim",
            url: url,
            host: BASE_URL
        });
    }

    // Cache TOC để toc.js đọc offline tức thì
    cacheStorage.setItem("cached_toc_" + slug, JSON.stringify(episodesList));

    // 4. Tạo gợi ý đề xuất qua API getSuggestedEpisodes
    var suggests = [];
    if (hash && episodeId) {
        try {
            var suggestPayload = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify([
                { "currentId": 1, "excludeIds": 2 }, episodeId, []
            ])));
            suggests.push({
                title: "Phim đề xuất",
                input: BASE_URL + "/_app/remote/" + hash + "/getSuggestedEpisodes?payload=" + encodeURIComponent(suggestPayload),
                script: "suggest.js"
            });
        } catch (e) {}
    }
    if (suggests.length === 0) {
        // Fallback dùng tên phim để search gợi ý
        suggests.push({
            title: "Phim đề xuất",
            input: name,
            script: "search.js"
        });
    }

    // 5. Bình luận
    var comments = undefined;
    if (episodeId) {
        var commentHash = "1edhnia";
        var commentHashMatch = html.match(/\/remote\/([a-zA-Z0-9_-]+)\/getComments/);
        if (commentHashMatch) {
            commentHash = commentHashMatch[1];
        }
        comments = [{
            title: "Bình luận",
            input: JSON.stringify({ episodeId: episodeId, hash: commentHash }),
            script: "comment.js"
        }];
    }

    var responseObj = {
        name: name,
        host: BASE_URL,
        author: author,
        description: description,
        ongoing: true,
        genres: genres.length > 0 ? genres : undefined,
        suggests: suggests.length > 0 ? suggests : undefined,
        comments: comments
    };

    if (cover) {
        responseObj.cover = cover;
    }

    return Response.success(responseObj);
}
