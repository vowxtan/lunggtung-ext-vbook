load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var b = Engine.newBrowser();
    var doc = null;
    try {
        b.setUserAgent(UserAgent.chrome());
        b.launchAsync(url);

        // Chờ SvelteKit render chi tiết phim và danh sách gợi ý phim liên quan
        for (var j = 0; j < 10; j++) {
            sleep(750);
            doc = b.html();
            // Đợi đến khi có tiêu đề h2 và danh sách phim gợi ý (.space-y-3) xuất hiện
            if (doc && doc.select("h2").size() > 0 && doc.select(".space-y-3 a[href*='/watch/']").size() > 0) break;
        }
    } finally {
        b.close();
    }

    if (!doc) {
        return Response.error("Không thể tải trang chi tiết phim: " + url);
    }

    var html = doc.toString() + "";
    var slug = url.split('/').pop();
    
    // 1. Parse tiêu đề
    var rawName = doc.select("h2").first() ? doc.select("h2").first().text() + "" : "";
    var name = rawName.replace(/\s*-\s*Tập\s*\d+.*$/i, "").replace(/\s*Tập\s*\d+.*$/i, "").trim();

    // 2. Parse ảnh bìa
    var cover = "";
    var imgEl = doc.select("img[src*='storage.haiten.org']").first() || doc.select("img").first();
    if (imgEl) {
        cover = imgEl.attr("src") || imgEl.attr("data-src") || "";
    }
    cover = normalizeCoverUrl(cover);

    // 3. Parse mô tả
    var description = doc.select(".pointer-events-auto p").text() + "";
    if (!description) {
        description = doc.select(".line-clamp-3").text() + "";
    }

    // 4. Parse tác giả/Studio
    var author = "HentaiZ";
    var studioEl = doc.select("a[href*='/studios/']").first();
    if (studioEl) {
        author = studioEl.text().trim();
    }

    // 5. Parse thể loại
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

    // 6. Lưu cache danh sách tập phim (TOC) để toc.js đọc nhanh gọn
    var episodesList = [];
    doc.select(".divide-y a[href*='/watch/']").forEach(function(el) {
        var epTitle = el.select("span").text() || el.text() || "";
        var epHref = el.attr("href") + "";
        if (epHref) {
            episodesList.push({
                name: epTitle.trim(),
                url: normalizeUrl(epHref)
            });
        }
    });
    if (episodesList.length > 0) {
        cacheStorage.setItem("cached_toc_" + slug, JSON.stringify(episodesList));
    }

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
            var dataArr = [];
            eval("dataArr = " + dataMatch[1] + ";");
            for (var i = 0; i < dataArr.length; i++) {
                if (dataArr[i] && dataArr[i].data && dataArr[i].data.episode) {
                    episodeId = dataArr[i].data.episode.id || "";
                    break;
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

    // Chỉ truyền cover lên nếu là link ảnh thực sự hợp lệ (không chứa /watch/) để tránh ghi đè ảnh bìa cũ của trang chủ
    if (cover && cover.indexOf('/watch/') === -1 && cover.indexOf('storage.haiten.org') !== -1) {
        responseObj.cover = cover;
    }

    return Response.success(responseObj);
}
