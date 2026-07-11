load("config.js");

function execute(input, page) {
    if (!page) page = "1";
    var episodeId = "";
    var hash = "18sc35r"; // Default comment hash

    try {
        var params = JSON.parse(input);
        episodeId = params.episodeId;
        hash = params.hash || "18sc35r";
    } catch (e) {
        episodeId = input; // Fallback
    }

    if (!episodeId) return Response.success([]);

    load("crypto.js");
    // Tuần tự hóa SvelteKit devalue payload cho comments
    var payload = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify([
        ["__skrao", 1],
        { "commentableId": 2, "commentableType": 3, "page": 4, "sort": 5 },
        episodeId,
        "ANIME_EPISODE",
        parseInt(page) || 1,
        "top"
    ])));
    var url = BASE_URL + "/_app/remote/" + hash + "/getComments?payload=" + encodeURIComponent(payload);

    var res = fetch(url, { headers: { "User-Agent": UserAgent.chrome() } });
    if (res && res.ok) {
        var text = res.text();
        var root = JSON.parse(text + "");
        var svelteData = root.result || (root.data && root.data.result);
        if (svelteData) {
            var table = [];
            try { eval("table = " + svelteData + ";"); } catch (e) { }
            
            // Tìm mảng indices động tương tự như detail.js
            var indices = null;
            if (table[1] && Array.isArray(table[1])) {
                indices = table[1];
            } else if (table[2] && Array.isArray(table[2])) {
                indices = table[2];
            }
            
            if (!indices) {
                for (var idx = 0; idx < table.length; idx++) {
                    var item = table[idx];
                    if (item && typeof item === 'object') {
                        var ref = item.comments || item.items;
                        if (typeof ref === 'number' && Array.isArray(table[ref])) {
                            indices = table[ref];
                            break;
                        }
                    }
                }
            }

            var comments = [];
            if (indices && Array.isArray(indices)) {
                function resolve(idx) { return (typeof idx === 'number') ? table[idx] : idx; }

                for (var i = 0; i < indices.length; i++) {
                    var item = resolve(indices[i]);
                    if (item && item.content) {
                        var author = resolve(item.author) || {};
                        var profile = resolve(author.profile) || {};
                        var content = resolve(item.content);
                        var createdAtArr = resolve(item.createdAt);
                        var userName = resolve(author.name) || resolve(author.username);
                        var avatarObj = resolve(profile.avatar);
                        
                        var dateStr = "";
                        if (Array.isArray(createdAtArr) && createdAtArr[0] === "Date") {
                            try {
                                var d = new Date(createdAtArr[1]);
                                if (!isNaN(d.getTime())) dateStr = d.toLocaleString();
                            } catch(e) {}
                        }

                        comments.push({
                            name: userName || "Ẩn danh",
                            content: content ? content.replace(/<[^>]*>?/gm, '').trim() : "",
                            avatar: (avatarObj && resolve(avatarObj.filePath)) ? normalizeCoverUrl(resolve(avatarObj.filePath)) : "",
                            description: dateStr
                        });
                    }
                }
            }

            var next = (indices && indices.length >= 10) ? (parseInt(page) + 1).toString() : "";
            return Response.success(comments, next);
        }
    }

    return Response.error("Không tải được bình luận");
}
