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

    if (doc && doc.select("h2").size() > 0) {
        return parseDetail(doc, url);
    }
    return Response.error("Không thể tải chi tiết phim: " + url);
}

function parseDetail(doc, url) {
    var rawName = doc.select("h2").first() ? doc.select("h2").first().text() + "" : "";
    // Cắt bỏ phần " - Tập X" để lấy tên gốc của phim
    var name = rawName.replace(/\s*-\s*Tập\s*\d+.*$/i, "").replace(/\s*Tập\s*\d+.*$/i, "").trim();

    // Lấy ảnh bìa từ thẻ meta og:image để đảm bảo ảnh chất lượng cao và luôn tồn tại
    var cover = doc.select("meta[property=og:image]").attr("content") + "";
    if (!cover) {
        // Fallback lấy ảnh bìa từ thẻ img đầu tiên trong sidebar
        var imgEl = doc.select("img").first();
        cover = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src") || "") + "" : "";
    }
    cover = normalizeUrl(cover);

    var description = doc.select(".line-clamp-3").text() + "";

    var genres = [];
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

    // Trích xuất slug phim hiện tại để lọc bỏ các tập cùng bộ trong đề xuất
    var currentSlug = "";
    var parts = url.split('/watch/');
    if (parts.length > 1) {
        currentSlug = parts[1].split('?')[0].replace(/-\d+$/, "");
    }

    // Lấy HTML các card phim khác làm danh sách đề xuất
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

    return Response.success({
        name: name,
        cover: cover,
        host: BASE_URL,
        author: "HentaiZ",
        description: description,
        ongoing: true,
        genres: genres,
        suggests: suggests.length > 0 ? suggests : undefined
    });
}
