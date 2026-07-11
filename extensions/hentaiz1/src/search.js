load('config.js');

function execute(key, page) {
    if (!page) page = '1';
    
    // Encode từ khóa tìm kiếm
    var searchUrl = BASE_URL + "/browse?q=" + encodeURIComponent(key);
    
    if (page !== '1') {
        searchUrl += "&page=" + page;
    }

    var res = fetch(searchUrl, { headers: { "User-Agent": UserAgent.chrome() } });
    if (res && res.ok) {
        var html = res.text();
        var svelteData = parseSvelteKitData(html);
        if (svelteData) {
            var list = parseEpisodes(svelteData);
            if (list.length > 0) {
                var hasNext = list.length >= 12;
                var next = hasNext ? (parseInt(page) + 1).toString() : null;

                return Response.success(list, next);
            }
        }
    }
    
    return Response.error("Tìm kiếm thất bại hoặc không tìm thấy phim: " + key);
}
