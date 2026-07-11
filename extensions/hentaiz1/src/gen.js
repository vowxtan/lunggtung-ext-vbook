load('config.js');

function execute(url, page) {
    if (!page) page = '1';
    var fetchUrl = url;
    
    // Nếu không phải trang 1, chèn query parameter page
    if (page !== '1') {
        if (fetchUrl.indexOf('?') > 0) {
            fetchUrl += '&page=' + page;
        } else {
            fetchUrl += '?page=' + page;
        }
    }

    var b = Engine.newBrowser();
    var doc = null;
    try {
        b.setUserAgent(UserAgent.chrome());
        b.launchAsync(fetchUrl);

        // Chờ SvelteKit render Client-side JS
        // Giai đoạn 1: Chờ cho đến khi có ít nhất 1 card link xuất hiện
        for (var j = 0; j < 10; j++) {
            sleep(750);
            doc = b.html();
            if (doc && doc.select('a[href*="/watch/"]').size() > 0) break;
        }

        // Giai đoạn 2: Chờ thêm để SvelteKit hydrate xong toàn bộ ảnh bìa
        // Chờ cho đến khi hầu hết các card đã được gán ảnh thật từ CDN (tối thiểu 12 ảnh)
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
    
    return Response.error("Không thể tải danh sách phim từ: " + fetchUrl);
}
