load('config.js');

function execute(key, page) {
    if (!page) page = '1';
    
    // Encode từ khóa tìm kiếm
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
    } finally {
        b.close();
    }

    if (doc && doc.select('a[href*="/watch/"]').size() > 0) {
        var list = parseCards(doc);
        
        // Nếu số lượng kết quả lấy được >= 12, giả định có trang kế tiếp
        var hasNext = list.length >= 12;
        var next = hasNext ? (parseInt(page) + 1).toString() : null;

        return Response.success(list, next);
    }
    
    return Response.error("Tìm kiếm thất bại hoặc không tìm thấy phim: " + key);
}
