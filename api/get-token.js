// api/get-token.js

// Helper function để xử lý lỗi một cách nhất quán
const handleError = (res, message, statusCode = 500) => {
    console.error(message);
    return res.status(statusCode).json({ success: false, message });
};

module.exports = async (req, res) => {
    try {
        const translatorUrl = "https://www.bing.com/translator";
        const response = await fetch(translatorUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            return handleError(res, `Không thể truy cập Bing Translator. Status code: ${response.status}`);
        }

        const html = await response.text();

        // Trích xuất IG
        const igMatch = html.match(/IG:"([A-Za-z0-9]+)"/);
        if (!igMatch || !igMatch[1]) {
            return handleError(res, "Không thể tìm thấy IG. Cấu trúc trang Bing có thể đã thay đổi.");
        }
        const IG = igMatch[1];

        // Trích xuất IID
        const iidMatch = html.match(/data-iid="([^"]+)"/);
        if (!iidMatch || !iidMatch[1]) {
            return handleError(res, "Không thể tìm thấy IID. Cấu trúc trang Bing có thể đã thay đổi.");
        }
        const IID = iidMatch[1];

        // Trích xuất key và token từ params_AbusePreventionHelper
        const paramsMatch = html.match(/var params_AbusePreventionHelper\s?=\s?(\[.*?\]);/);
        if (!paramsMatch || !paramsMatch[1]) {
            return handleError(res, "Không thể tìm thấy params_AbusePreventionHelper. Cấu trúc trang Bing có thể đã thay đổi.");
        }
        
        const params = JSON.parse(paramsMatch[1]);
        const key = params[0];
        const token = params[1];
        const tokenExpiryInterval = params[3];

        if (!key || !token) {
             return handleError(res, "Không thể trích xuất key hoặc token từ params.");
        }

        // Trả về tất cả dữ liệu cần thiết
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate'); // Cache trong 10 phút
        res.status(200).json({
            success: true,
            IG,
            IID,
            key,
            token,
            tokenExpiryInterval
        });

    } catch (error) {
        return handleError(res, `Đã xảy ra lỗi phía máy chủ: ${error.message}`);
    }
};
