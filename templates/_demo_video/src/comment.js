load('config.js');

// comment.js — Bình luận cho tập phim
// Contract: execute(input, page) → [{ name*, content*, avatar?, description? }], nextPage?
// input: episode ID hoặc JSON {episodeId, hash}
function execute(input, page) {
    if (!page) page = "1";
    var episodeId = input;

    // TODO: Nếu input là JSON, parse episodeId, hash v.v.
    // if (input && input.indexOf('{') === 0) {
    //     try {
    //         var params = JSON.parse(input);
    //         episodeId = params.episodeId;
    //     } catch (e) {}
    // }

    if (!episodeId) return Response.success([]);

    // TODO: Gọi API lấy danh sách bình luận
    // var res = fetch(url, { headers: { "User-Agent": UserAgent.chrome() } });
    // if (!res || !res.ok) return Response.error("Không tải được bình luận");

    // TODO: Parse danh sách comment
    // var comments = [];
    // return Response.success(comments, nextPage);

    return Response.error("comment.js chưa được cấu hình cho site này");
}
