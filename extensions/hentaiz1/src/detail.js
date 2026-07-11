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
    var b = Engine.newBrowser();
    var doc = null;
    try {
        // Sử dụng UserAgent Android di động để WebView render tự nhiên, bypass lỗi màn hình đen của SvelteKit
        b.setUserAgent(UserAgent.android());
        b.launchAsync(url);

        // Chờ SvelteKit render chi tiết phim và danh sách gợi ý phim liên quan (.space-y-3)
        for (var j = 0; j < 10; j++) {
            sleep(750);
            doc = b.html();
            if (doc && doc.select("h2").size() > 0 && doc.select(".space-y-3 a[href*='/watch/']").size() > 0) break;
        }
    } finally {
        b.close();
    }

    if (!doc) {
        return Response.error("Không thể tải trang chi tiết phim: " + url);
    }

    var html = doc.toString() + "";
    var slug = decodeURIComponent(url.split('/').pop());
    
    // 1. Parse tiêu đề
    var rawName = doc.select("h2").first() ? doc.select("h2").first().text() + "" : "";
    var name = rawName.replace(/\s*-\s*Tập\s*\d+.*$/i, "").replace(/\s*Tập\s*\d+.*$/i, "").trim();

    // 2. Parse mô tả
    var description = doc.select(".pointer-events-auto p").text() + "";
    if (!description) {
        description = doc.select(".line-clamp-3").text() + "";
    }

    // 3. Parse tác giả/Studio
    var author = "HentaiZ";
    var studioEl = doc.select("a[href*='/studios/']").first();
    if (studioEl) {
        author = studioEl.text().trim();
    }

    // 4. Parse thể loại
    var genres = [];
    doc.select("a[href*='/genres/']").forEach(function(el) {
        var gTitle = el.text().trim();
        var gHref = el.attr("href") + "";
        if (gTitle && gHref) {
            genres.push({
                title: gTitle,
                input: normalizeUrl(gHref),
                script: "gen.js"
            });
        }
    });

    // 5. Cào danh sách tập phim (TOC) từ DOM đã render
    var episodesList = [];
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

    // 6. Gọi API getSeriesEpisodes làm bổ trợ cào ảnh bìa và TOC (đặc biệt hữu dụng cho phim lẻ OVA)
    var cover = "";
    var hash = "1edhnia"; // hash mặc định
    var hashMatch = html.match(/\/remote\/([a-zA-Z0-9_-]+)\/getSeriesEpisodes/);
    if (hashMatch) {
        hash = hashMatch[1];
    }

    try {
        load("crypto.js");
        var payload = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify([{ "currentSlug": 1 }, slug])));
        var apiUrl = BASE_URL + "/_app/remote/" + hash + "/getSeriesEpisodes?payload=" + encodeURIComponent(payload);
        
        var apiRes = fetch(apiUrl, { headers: { "User-Agent": UserAgent.android() } });
        if (apiRes && apiRes.ok) {
            var apiData = JSON.parse(apiRes.text() + "");
            var svelteData = null;
            if (apiData.data) {
                if (typeof apiData.data === 'string') {
                    try {
                        svelteData = JSON.parse(apiData.data);
                    } catch (e) {}
                } else {
                    svelteData = apiData.data;
                }
            }
            if (!svelteData) {
                svelteData = apiData.result;
            }

            if (svelteData) {
                // Quét tìm ảnh bìa poster dọc chất lượng cao chính xác
                if (Array.isArray(svelteData)) {
                    for (var idx = 0; idx < svelteData.length; idx++) {
                        var item = svelteData[idx];
                        if (typeof item === 'string') {
                            var matchCover = item.match(/\/202[0-9]\/[0-9]{2}\/[a-zA-Z0-9-_.]+\.(?:jpg|png|webp)/i);
                            if (matchCover) {
                                cover = normalizeCoverUrl(matchCover[0]);
                                break;
                            }
                        }
                    }
                }

                // Nếu cào DOM tập phim bị rỗng (ví dụ phim lẻ), dùng data giải mã từ API
                if (episodesList.length === 0) {
                    episodesList = parseSvelteTable(svelteData);
                }
            }
        }
    } catch (e) {
        // Lỗi lấy API mục lục thì bỏ qua
    }

    // Fallback: Tìm ảnh bìa từ SvelteKit hydration data trong HTML nếu API không trả về
    if (!cover) {
        doc.select("script").forEach(function(s) {
            var text = s.html() + "";
            if (text.indexOf("filePath") !== -1 || text.indexOf("backdropImage") !== -1) {
                text = decodeSvelteKitString(text);
                var fileMatch = text.match(/filePath\s*:\s*["']([^"']+)["']/);
                if (fileMatch) {
                    cover = normalizeCoverUrl(fileMatch[1]);
                }
            }
        });
    }

    // Nếu vẫn rỗng tập, thêm tập hiện tại làm tập đơn
    if (episodesList.length === 0) {
        episodesList.push({
            name: "Xem phim",
            url: url,
            host: BASE_URL
        });
    }

    // Lưu cache danh sách tập phim cuối cùng để toc.js đọc offline tức thì
    cacheStorage.setItem("cached_toc_" + slug, JSON.stringify(episodesList));

    // 7. Tạo danh sách phim liên quan
    var suggests = [];
    var suggestHtml = doc.select(".space-y-3").html() + "";
    if (suggestHtml) {
        suggests.push({
            title: "Phim đề xuất",
            input: suggestHtml,
            script: "suggest.js"
        });
    }

    // 8. Trích xuất episodeId từ SvelteKit JSON data nhúng trong HTML thô để hiển thị bình luận
    var episodeId = "";
    var dataMatch = html.match(/data:\s*(\[[\s\S]*?\])\s*,\s*uses:/);
    if (!dataMatch) {
        dataMatch = html.match(/data:\s*(\[[\s\S]*?\])/);
    }
    if (dataMatch) {
        try {
            var jsonStr = "";
            var startIdx = html.indexOf('data:');
            if (startIdx !== -1) {
                var bracketCount = 0;
                var started = false;
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
                var dataArr = [];
                eval("dataArr = " + jsonStr + ";");
                for (var idx = 0; idx < dataArr.length; idx++) {
                    if (dataArr[idx] && dataArr[idx].data && dataArr[idx].data.episode) {
                        episodeId = dataArr[idx].data.episode.id || "";
                        break;
                    }
                }
            }
        } catch (e) {}
    }

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
        description: description.trim(),
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
