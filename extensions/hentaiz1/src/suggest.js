load('config.js');

function execute(input) {
    // Nếu input là chuỗi JSON từ API getSuggestedEpisodes
    if (input && (input.indexOf('[') === 0 || input.indexOf('{') === 0)) {
        try {
            var data = JSON.parse(input);
            var indices = data[2]; // mảng chứa các chỉ số tập phim gợi ý
            if (!indices || !Array.isArray(indices)) return Response.success([]);

            function resolve(idx) {
                return (typeof idx === 'number') ? data[idx] : idx;
            }

            var books = [];
            for (var i = 0; i < indices.length; i++) {
                var item = resolve(indices[i]);
                if (item && item.slug) {
                    var title = resolve(item.title) || "";
                    var slug = resolve(item.slug);
                    
                    // Lấy ảnh bìa dọc chất lượng cao (posterImage)
                    var cover = "";
                    var posterObj = resolve(item.posterImage);
                    if (posterObj && posterObj.filePath) {
                        cover = normalizeCoverUrl(resolve(posterObj.filePath));
                    } else if (item.backdropImage) {
                        var backdropObj = resolve(item.backdropImage);
                        if (backdropObj && backdropObj.filePath) {
                            cover = normalizeCoverUrl(resolve(backdropObj.filePath));
                        }
                    }

                    books.push({
                        name: title,
                        link: BASE_URL + "/watch/" + slug,
                        cover: cover,
                        host: BASE_URL
                    });
                }
            }
            return Response.success(books);
        } catch (e) {
            return Response.error("Lỗi parse phim gợi ý: " + e.message);
        }
    }

    // Fallback: parse HTML thô cũ
    var doc = Html.parse(input);
    var books = parseCards(doc);
    return Response.success(books);
}
