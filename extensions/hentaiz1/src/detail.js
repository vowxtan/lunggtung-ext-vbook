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

function extractSvelteData(html) {
    var startIdx = html.indexOf('data:');
    if (startIdx === -1) return null;
    
    var bracketCount = 0;
    var started = false;
    var jsonStr = "";
    
    // Duyệt ký tự đếm ngoặc để trích xuất mảng dữ liệu lồng nhau an toàn
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
                return jsonStr;
            }
        }
    }
    return null;
}

function execute(url) {
    url = normalizeUrl(url);
    
    // Gửi request fetch tĩnh thay vì dùng WebView để tránh bị bộ chặn AdBlock của VBook app làm lỗi đen trang
    var res = fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        }
    });

    if (!res || !res.ok) {
        return Response.error("Không thể tải trang chi tiết phim: " + url);
    }

    var html = res.text() + "";
    var slug = url.split('/').pop();
    
    // Bóc tách SvelteKit JSON data ẩn nhúng sẵn trong HTML tĩnh bằng thuật toán đếm ngoặc lồng nhau
    var jsonStr = extractSvelteData(html);
    if (!jsonStr) {
        return Response.error("Không tìm thấy dữ liệu cấu trúc SvelteKit.");
    }

    var dataArr = [];
    try {
        eval("dataArr = " + jsonStr + ";");
    } catch (e) {
        return Response.error("Lỗi biên dịch SvelteKit JSON: " + e.message);
    }

    // Tìm index chứa dữ liệu tập phim (episode)
    var epData = null;
    for (var i = 0; i < dataArr.length; i++) {
        if (dataArr[i] && dataArr[i].data && dataArr[i].data.episode) {
            epData = dataArr[i].data.episode;
            break;
        }
    }

    if (!epData) {
        return Response.error("Không có thông tin tập phim trong payload.");
    }

    // 1. Parse tiêu đề
    var rawName = epData.title || "";
    var name = rawName.replace(/\s*-\s*Tập\s*\d+.*$/i, "").replace(/\s*Tập\s*\d+.*$/i, "").trim();

    // 2. Parse ảnh bìa chính chủ từ JSON data
    var cover = "";
    var imgObj = epData.posterImage || epData.backdropImage || epData.thumbnailImage;
    if (imgObj && imgObj.filePath) {
        cover = normalizeCoverUrl(imgObj.filePath);
    }

    // 3. Parse mô tả
    var description = (epData.description || "").replace(/<[^>]*>?/gm, '').trim();

    // 4. Parse tác giả/Studio
    var author = "HentaiZ";
    if (epData.studios && epData.studios.length > 0) {
        var sObj = epData.studios[0].studio || epData.studios[0];
        if (sObj && sObj.name) {
            author = sObj.name.trim();
        }
    }

    // 5. Parse thể loại
    var genres = [];
    if (epData.genres && epData.genres.length > 0) {
        for (var k = 0; k < epData.genres.length; k++) {
            var gItem = epData.genres[k].genre || epData.genres[k];
            if (gItem && gItem.name && gItem.slug) {
                genres.push({
                    title: gItem.name,
                    input: BASE_URL + "/genres/" + gItem.slug,
                    script: "gen.js"
                });
            }
        }
    }

    // 6. Cào danh sách tập phim (TOC) ban đầu từ DOM tĩnh
    var episodesList = [];
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

    // 7. Gọi API getSeriesEpisodes bằng fetch tĩnh để lấy danh sách tập phim và ảnh bìa fallback
    var hash = "1edhnia";
    var hashMatch = html.match(/\/remote\/([a-zA-Z0-9_-]+)\/getSeriesEpisodes/);
    if (hashMatch) {
        hash = hashMatch[1];
    }

    try {
        load("crypto.js");
        var payload = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify([{ "currentSlug": 1 }, slug])));
        var apiUrl = BASE_URL + "/_app/remote/" + hash + "/getSeriesEpisodes?payload=" + encodeURIComponent(payload);
        
        var apiRes = fetch(apiUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });
        if (apiRes && apiRes.ok) {
            var apiData = JSON.parse(apiRes.text() + "");
            var svelteData = apiData.result || (apiData.data && apiData.data.result);
            if (svelteData) {
                // Lấy ảnh bìa từ API nếu bước trên bị rỗng (đặc biệt hữu dụng cho các tập phim OVA lẻ)
                if (!cover) {
                    var matchCover = JSON.stringify(svelteData).match(/(\/202[0-9]\/[0-9]{2}\/[a-zA-Z0-9-]+\.(?:jpg|png|webp))/);
                    if (matchCover) {
                        cover = normalizeCoverUrl(matchCover[1]);
                    }
                }
                // Giải mã danh sách tập phim
                if (episodesList.length === 0) {
                    episodesList = parseSvelteTable(svelteData);
                }
            }
        }
    } catch (e) {
        // Lỗi lấy API mục lục thì bỏ qua
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

    // 8. Tạo danh sách phim liên quan bằng cách parse HTML thô tải về (JSoup offline)
    var suggests = [];
    var suggestHtml = doc.select(".space-y-3").html() + "";
    if (suggestHtml) {
        suggests.push({
            title: "Phim đề xuất",
            input: suggestHtml,
            script: "suggest.js"
        });
    }

    // 9. Trích xuất episodeId để hiển thị bình luận
    var episodeId = epData.id || "";
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
