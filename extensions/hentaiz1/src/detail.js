load('config.js');

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
    
    var doc = Html.parse(html);
    
    // 1. Parse tiêu đề
    var h2El = doc.select("h2").first();
    var rawName = h2El ? h2El.text() + "" : "";
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

    // 5. Cào danh sách tập phim (TOC) và trích xuất ảnh bìa trực tiếp từ thumbnail tập phim đầu tiên
    var cover = "";
    var episodesList = [];
    doc.select(".divide-y a[href*='/watch/']").forEach(function(el) {
        var epTitle = el.select("span").text() || el.text() || "";
        var epHref = el.attr("href") + "";
        
        // Lấy ảnh bìa trực tiếp từ ảnh của tập phim đầu tiên trong danh sách
        var imgEl = el.select("img").first();
        var imgSrc = imgEl ? imgEl.attr("src") || imgEl.attr("data-src") + "" : "";
        if (imgSrc && !cover) {
            cover = normalizeCoverUrl(imgSrc);
        }
        
        if (epHref) {
            episodesList.push({
                name: epTitle.trim(),
                url: normalizeUrl(epHref),
                host: BASE_URL
            });
        }
    });

    // Sắp xếp lại danh sách tập phim (đảo lại cho đúng thứ tự tập 1 lên trước)
    if (episodesList.length > 0) {
        episodesList = episodesList.reverse();
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

    // 6. Tạo danh sách phim liên quan bằng cách parse HTML thô tải về (JSoup offline)
    var suggests = [];
    var suggestHtml = doc.select(".space-y-3").html() + "";
    if (suggestHtml) {
        suggests.push({
            title: "Phim đề xuất",
            input: suggestHtml,
            script: "suggest.js"
        });
    }

    // 7. Trích xuất episodeId để hiển thị bình luận
    var episodeId = "";
    var idMatch = html.match(/"id"\s*:\s*"([a-zA-Z0-9_-]{10,})"/);
    if (idMatch) {
        episodeId = idMatch[1];
    } else {
        var fallbackMatch = html.match(/"id"\s*:\s*"([a-zA-Z0-9_-]+)"/);
        if (fallbackMatch) episodeId = fallbackMatch[1];
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
