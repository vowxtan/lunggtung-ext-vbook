load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var slug = url.split('/').pop();

    // 1. Thử lấy từ cacheStorage đã được lưu ở detail.js (Chạy offline cực nhanh)
    var cached = cacheStorage.getItem("cached_toc_" + slug);
    if (cached) {
        try {
            var table = JSON.parse(cached);
            var chapters = parseSvelteTable(table);
            if (chapters && chapters.length > 0) {
                return Response.success(chapters);
            }
        } catch (e) {
            // Lỗi parse cache thì fallback cào WebView DOM bên dưới
        }
    }

    // 2. Fallback: Khởi chạy WebView để cào DOM online nếu không có cache
    var b = Engine.newBrowser();
    var doc = null;
    try {
        b.setUserAgent(UserAgent.chrome());
        b.launchAsync(url);

        // Chờ SvelteKit render danh sách các tập phim
        for (var j = 0; j < 10; j++) {
            sleep(750);
            doc = b.html();
            if (doc && doc.select("a[href*='/watch/']").size() > 0) break;
        }
    } finally {
        b.close();
    }

    if (doc && doc.select("a[href*='/watch/']").size() > 0) {
        return parseTOC(url, doc);
    }
    return Response.error("Không thể tải danh sách tập phim: " + url);
}

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
    // Sắp xếp lại hiển thị Tập 1 ở đầu
    return chapters.reverse();
}

function parseTOC(url, doc) {
    var chapters = [];
    var seen = {};

    var parts = url.split('/watch/');
    var slug = "";
    if (parts.length > 1) {
        slug = parts[1].split('?')[0].replace(/-\d+$/, "");
    }

    if (!slug) {
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
            var displayName = "";
            var textLines = rawText.split('\n').map(function(t) { return t.trim(); }).filter(function(t) { return t !== ''; });
            
            if (textLines.length > 0) {
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
        chapters.push({
            name: doc.select("h2").first() ? doc.select("h2").first().text().trim() : "Xem ngay",
            url: url,
            host: BASE_URL
        });
    }

    return Response.success(chapters.reverse());
}
