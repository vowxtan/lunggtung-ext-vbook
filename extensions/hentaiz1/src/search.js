load('config.js');

function execute(key, page) {
    if (!page) page = '1';
    
    var searchUrl = BASE_URL + "/browse?q=" + encodeURIComponent(key);
    if (page !== '1') {
        searchUrl += "&page=" + page;
    }

    var b = Engine.newBrowser();
    var doc = null;
    try {
        b.setUserAgent(UserAgent.chrome());
        b.launchAsync(searchUrl);

        // Chờ SvelteKit render kết quả tìm kiếm
        for (var j = 0; j < 10; j++) {
            sleep(750);
            doc = b.html();
            if (doc && doc.select('a[href*="/watch/"]').size() > 0) break;
        }

        // Chờ SvelteKit hydrate xong toàn bộ ảnh bìa
        for (var k = 0; k < 12; k++) {
            sleep(300);
            doc = b.html();
            var loadedCovers = doc ? doc.select('a[href*="/watch/"] img[src*="storage.haiten"]').size() : 0;
            var totalCards = doc ? doc.select('a[href*="/watch/"]').size() : 0;
            if (loadedCovers >= Math.min(totalCards, 12)) break;
        }
    } finally {
        b.close();
    }

    if (doc) {
        var list = parseCards(doc);
        if (list.length > 0) {
            var hasNext = list.length >= 12;
            var next = hasNext ? (parseInt(page) + 1).toString() : null;

            return Response.success(list, next);
        }
    }
    
    return Response.error("Tìm kiếm thất bại hoặc không tìm thấy phim: " + key);
}
