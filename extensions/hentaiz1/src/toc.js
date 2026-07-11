load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var res = fetch(url);
    if (!res.ok) {
        // Fallback dùng Browser
        var browser = Engine.newBrowser();
        try {
            var doc = browser.launch(url, 8000);
            if (doc) {
                return parseTOC(url, doc);
            }
        } finally {
            browser.close();
        }
        return Response.error("Cannot load: " + res.status);
    }

    var doc = res.html();
    return parseTOC(url, doc);
}

function parseTOC(url, doc) {
    var chapters = [];
    var seen = {};

    // Trích xuất slug của phim hiện tại để lọc các tập cùng bộ
    // Ví dụ: từ "https://hentaiz1.com/watch/todo-no-tsumari-2" -> slug là "todo-no-tsumari"
    var parts = url.split('/watch/');
    var slug = "";
    if (parts.length > 1) {
        slug = parts[1].split('?')[0].replace(/-\d+$/, "");
    }

    if (!slug) {
        // Nếu không lấy được slug, fallback thêm tập hiện tại vào list
        return Response.success([{
            name: "Xem ngay",
            url: url,
            host: BASE_URL
        }]);
    }

    doc.select("a[href*='/watch/']").forEach(function(el) {
        var href = el.attr("href") + "";
        if (href.indexOf(slug) !== -1) {
            href = normalizeUrl(href);
            if (seen[href]) return;
            seen[href] = true;

            var rawText = el.text().trim();
            // Lấy text hiển thị gọn gàng, ví dụ "Tập X" hoặc "Tập X - Tên tập"
            var displayName = "";
            var textLines = rawText.split('\n').map(function(t) { return t.trim(); }).filter(function(t) { return t !== ''; });
            
            if (textLines.length > 0) {
                // Thường dòng đầu là "Tập X"
                if (textLines[0].indexOf("Tập") !== -1) {
                    displayName = textLines[0];
                } else {
                    displayName = textLines.join(" ");
                }
            } else {
                displayName = rawText.replace(/\n/g, " ");
            }

            if (!displayName) displayName = "Xem phim";

            chapters.push({
                name: displayName,
                url: href,
                host: BASE_URL
            });
        }
    });

    if (chapters.length === 0) {
        // Fallback nếu không parse được danh sách tập
        chapters.push({
            name: doc.select("h2").first() ? doc.select("h2").first().text().trim() : "Xem ngay",
            url: url,
            host: BASE_URL
        });
    }

    // Sắp xếp lại danh sách tập (thường HentaiZ liệt kê tập mới nhất lên đầu, 
    // đảo ngược lại để hiển thị Tập 1 trước)
    return Response.success(chapters.reverse());
}
