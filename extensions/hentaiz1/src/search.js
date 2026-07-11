load('config.js');

function execute(key, page) {
    if (!page) page = '1';
    
    // API Mode: SvelteKit __data.json
    var searchUrl = BASE_URL + "/browse/__data.json?q=" + encodeURIComponent(key) + "&page=" + page;
    var res = fetch(searchUrl, { headers: { "Accept": "application/json, text/plain, */*" } });
    if (res && res.ok) {
        var root = null;
        try { root = JSON.parse(res.text() + ""); } catch (e) { root = null; }
        if (root && root.nodes) {
            function resolveValue(v, table, memo) {
                if (v === null || v === undefined) return v;
                if (typeof v === "number") {
                    if (memo.hasOwnProperty(String(v))) return memo[String(v)];
                    var raw = table[v];
                    memo[String(v)] = raw;
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
                    if (payload && (payload.episodes || payload.items)) break;
                }
            }

            if (payload) {
                var items = payload.episodes || payload.items || (Array.isArray(payload) ? payload : []);
                var dataApi = [];
                items.forEach(function (item) {
                    if (!item) return;
                    var slug = (item.slug || "") + "";
                    if (!slug) return;

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

                    var cover = "";
                    var imgObj = item.posterImage || item.backdropImage || item.thumbnailImage;
                    if (imgObj && imgObj.filePath) {
                        cover = imgObj.filePath + "";
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

                if (dataApi.length > 0) {
                    var nextPage = String(parseInt(page) + 1);
                    return Response.success(dataApi, nextPage);
                }
            }
        }
    }

    // Fallback: Browser mode
    var browserUrl = BASE_URL + "/browse?q=" + encodeURIComponent(key);
    if (page !== '1') {
        browserUrl += "&page=" + page;
    }

    var b = Engine.newBrowser();
    var doc = null;
    try {
        b.setUserAgent(UserAgent.chrome());
        b.launchAsync(browserUrl);

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
    
    return Response.error("Tìm kiếm thất bại hoặc không tìm thấy phim: " + key);
}
