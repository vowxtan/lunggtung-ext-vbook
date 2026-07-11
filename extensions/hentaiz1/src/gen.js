load('config.js');

function execute(url, page) {
    if (!page) page = '1';
    var fetchUrl = url;

    // API mode: SvelteKit __data.json
    if (fetchUrl.indexOf("/__data.json") > -1) {
        var pageUrl = fetchUrl.indexOf("{{page}}") > -1 ? fetchUrl.replace("{{page}}", page) : fetchUrl;
        if (pageUrl.indexOf("page=") === -1 && page !== "1") {
            pageUrl = pageUrl + (pageUrl.indexOf("?") > -1 ? "&" : "?") + "page=" + page;
        }

        var res = fetch(pageUrl, { headers: { "Accept": "application/json, text/plain, */*" } });
        if (!res.ok) return Response.error("Cannot load: " + res.status);

        var root = null;
        try { root = JSON.parse(res.text() + ""); } catch (e) { root = null; }
        if (!root || !root.nodes) return Response.error("Invalid payload");

        function resolveValue(v, table, memo) {
            if (v === null || v === undefined) return v;
            if (typeof v === "number") {
                if (memo.hasOwnProperty(String(v))) return memo[String(v)];
                var raw = table[v];
                memo[String(v)] = raw; // Placeholder for recursion
                var resolved = resolveValue(raw, table, memo);
                memo[String(v)] = resolved;
                return resolved;
            }
            if (Array.isArray(v)) {
                return v.map(function (x) { return resolveValue(x, table, memo); });
            }
            if (typeof v === "object") {
                var outObj = {};
                for (var k in v) {
                    if (v.hasOwnProperty(k)) {
                        outObj[k] = resolveValue(v[k], table, memo);
                    }
                }
                return outObj;
            }
            return v;
        }

        var payload = null;
        for (var i = 0; i < root.nodes.length; i++) {
            var n = root.nodes[i];
            if (n && n.type === "data" && Array.isArray(n.data)) {
                payload = resolveValue(n.data[0], n.data, {});
                if (payload && (payload.episodes || payload.genres || payload.items || payload.genre)) break;
            }
        }

        if (!payload) return Response.error("Data structure not found");

        // Items can be in .episodes, .items, or just the payload itself if it's an array
        var items = payload.episodes || payload.items || (Array.isArray(payload) ? payload : []);

        // If it's a genre page, it might be nested differently
        if (items.length === 0 && payload.genre && payload.genre.episodes) {
            items = payload.genre.episodes;
        }

        var dataApi = [];
        items.forEach(function (item) {
            if (!item) return;
            var slug = (item.slug || "") + "";
            if (!slug) return;

            // Extract episode count for tags
            var tags = "";
            var epCount = 0;
            var slugMatch = slug.match(/-(\d+)$/);
            if (slugMatch) {
                epCount = parseInt(slugMatch[1]) || 0;
            }
            if (epCount === 0) {
                epCount = item.episodeNumber || 0;
            }
            if (epCount > 0) {
                tags = "Tập " + epCount;
            }

            var name = ((item.title || item.name || slug) + "").trim();

            // Image logic: posterImage > backdropImage > thumbnailImage
            var cover = "";
            var imgObj = item.posterImage || item.backdropImage || item.thumbnailImage;
            if (imgObj && imgObj.filePath) {
                cover = imgObj.filePath + "";
            } else if (payload.genre) {
                var gImg = payload.genre.posterImage || payload.genre.backdropImage || payload.genre.thumbnailImage;
                if (gImg && gImg.filePath) cover = gImg.filePath + "";
            }

            if (cover && cover.indexOf("http") !== 0) {
                cover = cover.indexOf("/") === 0 ? (IMAGE_URL + cover) : (IMAGE_URL + "/" + cover);
            }

            dataApi.push({
                name: name,
                link: encodeURI(BASE_URL + "/watch/" + slug),
                cover: cover,
                host: BASE_URL,
                tag: tags
            });
        });

        var nextPage = String(parseInt(page) + 1);
        return Response.success(dataApi, nextPage);
    }

    // Fallback: Browser mode
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

        for (var j = 0; j < 10; j++) {
            sleep(750);
            doc = b.html();
            if (doc && doc.select('a[href*="/watch/"]').size() > 0) break;
        }

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
