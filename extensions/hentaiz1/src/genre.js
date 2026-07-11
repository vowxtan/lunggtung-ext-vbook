load('config.js');

function execute() {
    return Response.success([
        { title: "Vanilla", input: BASE_URL + "/genres/vanilla", script: "gen.js" },
        { title: "Harem", input: BASE_URL + "/genres/harem", script: "gen.js" },
        { title: "Gái quậy", input: BASE_URL + "/genres/gai-quay", script: "gen.js" },
        { title: "Giáo viên", input: BASE_URL + "/genres/giao-vien", script: "gen.js" },
        { title: "Sữa mẹ", input: BASE_URL + "/genres/sua-me", script: "gen.js" },
        { title: "Loạn luân (Incest)", input: BASE_URL + "/genres/incest", script: "gen.js" },
        { title: "NTR", input: BASE_URL + "/genres/ntr", script: "gen.js" },
        { title: "Cosplay", input: BASE_URL + "/genres/cosplay", script: "gen.js" },
        { title: "Sinh viên", input: BASE_URL + "/genres/sinh-vien", script: "gen.js" }
    ]);
}