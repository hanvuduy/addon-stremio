const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const API_HOST = "https://ophim18.cc";
const IMG_HOST = "https://img.ophim.live/uploads/movies/";

const builder = new addonBuilder({
    id: "org.ophim.fixed",
    version: "1.2.0",
    name: "OPhim Pro",
    description: "Nguồn phim tổng hợp - Fix lỗi Tìm kiếm & Catalog",
    resources: ["catalog", "meta", "stream"],
    types: ["movie", "series"],
    idPrefixes: ["ophim_"],
    catalogs: [
        { type: "movie", id: "ophim_new", name: "OPhim: Mới Cập Nhật" },
        { type: "movie", id: "ophim_phimle", name: "OPhim: Phim Lẻ" },
        { type: "series", id: "ophim_phimbo", name: "OPhim: Phim Bộ" }
    ]
});

// Xử lý Catalog & Tìm kiếm
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    let url = `${API_HOST}/danh-sach/phim-moi-cap-nhat?page=${(extra.skip / 20) + 1 || 1}`;
    
    // Logic tìm kiếm
    if (extra.search) {
        url = `${API_HOST}/v1/api/tim-kiem?keyword=${encodeURIComponent(extra.search)}`;
    } else if (id === "ophim_phimle") {
        url = `${API_HOST}/v1/api/danh-sach/phim-le?page=${(extra.skip / 20) + 1 || 1}`;
    } else if (id === "ophim_phimbo") {
        url = `${API_HOST}/v1/api/danh-sach/phim-bo?page=${(extra.skip / 20) + 1 || 1}`;
    }

    try {
        const res = await axios.get(url);
        // API v1 và API thường có cấu trúc trả về khác nhau, cần check kỹ:
        const items = res.data.data ? res.data.data.items : (res.data.items || []);
        
        const metas = items.map(p => ({
            id: `ophim_${p.slug}`,
            type: type || "movie",
            name: p.name,
            poster: p.poster_url?.includes('http') ? p.poster_url : `${IMG_HOST}${p.thumb_url}`
        }));
        return { metas };
    } catch (e) {
        return { metas: [] };
    }
});

// Xử lý Meta (Thông tin chi tiết)
builder.defineMetaHandler(async ({ id }) => {
    const slug = id.replace("ophim_", "");
    try {
        const res = await axios.get(`${API_HOST}/phim/${slug}`);
        const p = res.data.movie;
        return {
            meta: {
                id,
                type: p.type === "single" ? "movie" : "series",
                name: p.name,
                poster: p.poster_url,
                background: p.poster_url,
                description: p.content.replace(/<[^>]*>?/gm, ''), 
                releaseInfo: p.year?.toString()
            }
        };
    } catch (e) { return { meta: {} }; }
});

// Xử lý Stream
builder.defineStreamHandler(async ({ id }) => {
    const slug = id.replace("ophim_", "");
    try {
        const res = await axios.get(`${API_HOST}/phim/${slug}`);
        const episodes = res.data.episodes[0].server_data;
        const streams = episodes.map(ep => ({
            title: `Tập ${ep.name} (OPhim)`,
            url: ep.link_m3u8 
        }));
        return { streams };
    } catch (e) { return { streams: [] }; }
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
