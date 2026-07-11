load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var b = Engine.newBrowser();
    var doc = null;
    try {
        b.setUserAgent(UserAgent.chrome());
        b.launchAsync(url);

        // Chờ SvelteKit render chi tiết phim
        for (var j = 0; j < 10; j++) {
            sleep(750);
            doc = b.html();
            if (doc && doc.select("h2").size() > 0) break;
        }
    } finally {
        b.close();
    }

    if (!doc) {
        return Response.error("Không thể tải trang chi tiết phim: " + url);
    }

    var html = doc.toString() + "";
    var slug = url.split('/').pop();

    var name = "", cover = "", author = "HentaiZ", description = "", genres = [], episodeId = "";

    // 1. Phân tích khối dữ liệu SvelteKit thô từ HTML
    var dataMatch = html.match(/data:\s*(\[[\s\S]*?\]),\s*form:/);
    if (dataMatch) {
        try {
            var rawData = dataMatch[1];
            var dataArr = [];
            // Giải tuần tự hóa an toàn
            eval("dataArr = " + rawData + ";");
            
            var epData = null;
            for (var i = 0; i < dataArr.length; i++) {
                if (dataArr[i] && dataArr[i].data && dataArr[i].data.episode) {
                    epData = dataArr[i].data.episode;
                    break;
                }
            }

            if (epData) {
                episodeId = epData.id || "";
                name = (epData.title || "").trim();
                description = (epData.description || "").replace(/<[^>]*>?/gm, '').trim();

                // Lấy ảnh bìa chất lượng cao
                var imgObj = epData.posterImage || epData.backdropImage || epData.thumbnailImage;
                if (imgObj && imgObj.filePath) {
                    cover = normalizeCoverUrl(imgObj.filePath);
                }

                if (epData.studios && epData.studios.length > 0) {
                    author = epData.studios[0].studio.name || "HentaiZ";
                }

                if (epData.genres && epData.genres.length > 0) {
                    epData.genres.forEach(function (g) {
                        if (g.genre) {
                            genres.push({
                                title: g.genre.name,
                                input: BASE_URL + "/genres/" + g.genre.slug,
                                script: "gen.js"
                            });
                        }
                    });
                }
            }
        } catch (e) {
            // Lỗi parse thì bỏ qua, rơi xuống fallback cào DOM
        }
    }

    // 2. Gọi API getSeriesEpisodes của SvelteKit để lưu Cache mục lục tập phim
    var hash = "1edhnia"; // hash mặc định
    var hashMatch = html.match(/\/remote\/([a-zA-Z0-9_-]+)\/getSeriesEpisodes/);
    if (hashMatch) {
        hash = hashMatch[1];
    }

    try {
        load("crypto.js");
        var payload = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify([{ "currentSlug": 1 }, slug])));
        var apiUrl = BASE_URL + "/_app/remote/" + hash + "/getSeriesEpisodes?payload=" + encodeURIComponent(payload);
        
        var apiRes = fetch(apiUrl, { headers: { "User-Agent": UserAgent.chrome() } });
        if (apiRes && apiRes.ok) {
            var apiData = JSON.parse(apiRes.text() + "");
            var svelteData = apiData.result || (apiData.data && apiData.data.result);
            if (svelteData) {
                cacheStorage.setItem("cached_toc_" + slug, JSON.stringify(svelteData));
                
                // Fallback lấy ảnh bìa từ API nếu các bước trên bị rỗng
                if (!cover) {
                    var matchCover = JSON.stringify(svelteData).match(/(\/202[0-9]\/[0-9]{2}\/[a-zA-Z0-9-]+\.(?:jpg|png|webp))/);
                    if (matchCover) {
                        cover = normalizeCoverUrl(matchCover[1]);
                    }
                }
            }
        }
    } catch (e) {
        // Lỗi lấy API mục lục thì sẽ cào DOM thủ công ở toc.js
    }

    // 3. Fallback cào DOM thủ công nếu SvelteKit data bị rỗng
    if (!name) {
        var rawName = doc.select("h2").first() ? doc.select("h2").first().text() + "" : "";
        name = rawName.replace(/\s*-\s*Tập\s*\d+.*$/i, "").replace(/\s*Tập\s*\d+.*$/i, "").trim();
    }
    if (!cover) {
        var ogImg = doc.select("meta[property=og:image]").attr("content") + "";
        if (!ogImg) {
            var firstImg = doc.select("img").first();
            ogImg = firstImg ? (firstImg.attr("src") || firstImg.attr("data-src") || "") + "" : "";
        }
        cover = normalizeCoverUrl(ogImg);
    }
    if (!description) {
        description = doc.select(".line-clamp-3").text() + "";
    }
    if (genres.length === 0) {
        doc.select("a[href*='/genres/']").forEach(function (el) {
            var gTitle = el.text().trim() + "";
            var gHref = (el.attr("href") || "") + "";
            if (!gTitle || !gHref) return;
            genres.push({
                title: gTitle,
                input: normalizeUrl(gHref),
                script: "gen.js"
            });
        });
    }

    // 4. Tạo đề xuất phim liên quan
    var currentSlug = slug.replace(/-\d+$/, "");
    var suggestHtml = "";
    var seen = {};
    doc.select("a[href*='/watch/']").forEach(function(e) {
        var href = e.attr("href") + "";
        if (!href) return;
        href = normalizeUrl(href);
        if (currentSlug && href.indexOf(currentSlug) !== -1) return; // Bỏ qua tập phim cùng bộ
        if (seen[href]) return;
        seen[href] = true;
        suggestHtml += e.outerHtml();
    });

    var suggests = [];
    if (suggestHtml) {
        suggests.push({
            title: "Phim đề xuất",
            input: suggestHtml,
            script: "suggest.js"
        });
    }

    // 5. Cấu hình bình luận nếu có episodeId
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

    return Response.success({
        name: name,
        cover: cover,
        host: BASE_URL,
        author: author,
        description: description.trim(),
        ongoing: true,
        genres: genres.length > 0 ? genres : undefined,
        suggests: suggests.length > 0 ? suggests : undefined,
        comments: comments
    });
}
