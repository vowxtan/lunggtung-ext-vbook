load('config.js');

function execute(url) {
    url = normalizeUrl(url);

    var res = fetch(url);
    if (!res.ok) {
        // Fallback dùng Browser nếu fetch thông thường bị Cloudflare chặn
        var browser = Engine.newBrowser();
        try {
            var doc = browser.launch(url, 8000);
            if (doc) {
                return parseDetail(doc);
            }
        } finally {
            browser.close();
        }
        return Response.error("Cannot load: " + res.status);
    }

    var doc = res.html();
    return parseDetail(doc);
}

function parseDetail(doc) {
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

    return Response.success({
        name: name,
        cover: cover,
        host: BASE_URL,
        author: "HentaiZ",
        description: description,
        ongoing: true,
        genres: genres
    });
}
