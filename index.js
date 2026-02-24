const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const builder = new addonBuilder({
    id: "org.ophim.fixed.v3", // Đổi ID để Stremio làm mới cache
    version: "1.3.0",
    name: "OPhim Pro",
    description: "Nguồn phim tổng hợp - Đã fix lỗi kết nối Render",
    resources: ["catalog", "meta", "stream"],
    types: ["movie", "series"],
    idPrefixes: ["ophim_"],
    catalogs: [
        { type: "movie", id: "ophim_new", name: "OPhim: Mới Cập Nhật", extra: [{ name: "search" }] },
        { type: "movie", id: "ophim_phimle", name: "OPhim: Phim Lẻ" },
        { type: "series", id: "ophim_phimbo", name: "OPhim: Phim Bộ" }
    ]
});

builder.defineCatalogHandler(async ({ type, id, extra }) => {
    let url = `https://ophim1.com/danh-sach/phim-moi-cap-nhat?page=${(extra.skip / 20) + 1 || 1}`;
    
    if (extra.search) {
        url = `https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(extra.search)}`;
    } else if (id === "ophim_phimle") {
        url = `https://ophim1.com/v1/api/danh-sach/phim-le?page=${(extra.skip / 20) + 1 || 1}`;
    } else if (id === "ophim_phimbo") {
        url = `https://ophim1.com/v1/api/danh-sach/phim-bo?page=${(extra.skip / 20) + 1 || 1}`;
    }

    try {
        const res = await axios.get(url);
        const items = res.data.items || (res.data.data && res.data.data.items) || [];
        const metas = items.map(p => ({
            id: `ophim_${p.slug}`,
            type: "movie",
            name: p.name,
            poster: p.poster_url?.includes('http') ? p.poster_url : `https://img.ophim.live/uploads/movies/${p.thumb_url}`
        }));
        return { metas };
    } catch (e) { return { metas: [] }; }
});

builder.defineMetaHandler(async ({ id }) => {
    const slug = id.replace("ophim_", "");
    try {
        const res = await axios.get(`https://ophim1.com/phim/${slug}`);
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

builder.defineStreamHandler(async ({ id }) => {
    const slug = id.replace("ophim_", "");
    try {
        const res = await axios.get(`https://ophim1.com/phim/${slug}`);
        const streams = res.data.episodes[0].server_data.map(ep => ({
            title: `Tập ${ep.name} (Nguồn OPhim)`,
            url: ep.link_m3u8 
        }));
        return { streams };
    } catch (e) { return { streams: [] }; }
});

// QUAN TRỌNG: Render yêu cầu listen trên 0.0.0.0
serveHTTP(builder.getInterface(), { 
    port: process.env.PORT || 10000, 
    hostname: '0.0.0.0' 
});
