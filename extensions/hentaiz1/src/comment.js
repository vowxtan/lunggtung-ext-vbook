load("config.js");

function execute(input, page) {
    if (!page) page = "1";
    var episodeId = "";
    var hash = "1edhnia";

    try {
        var params = JSON.parse(input);
        episodeId = params.episodeId;
        hash = params.hash;
    } catch (e) {
        episodeId = input; // Fallback
    }

    if (!episodeId) return Response.success([]);

    load("crypto.js");
    // Tuần tự hóa SvelteKit devalue payload
    var payload = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify([
        { "commentableType": 1, "commentableId": 2, "page": 3, "sort": 4 },
        "ANIME_EPISODE",
        episodeId,
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
            var indices = table[1];
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
