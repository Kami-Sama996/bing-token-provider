// api/get-token.js
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chrome-aws-lambda');

module.exports = async (req, res) => {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // Đi đến trang demo TTS của Azure để kích hoạt việc tạo token
        await page.goto('https://azure.microsoft.com/en-us/products/cognitive-services/text-to-speech/', {
            waitUntil: 'networkidle0'
        });

        // Chờ đợi một cách đáng tin cậy cho đúng response chứa token
        const voiceListResponse = await page.waitForResponse(
            response => response.url().includes('speech.microsoft.com/cognitiveservices/voices/list') && response.status() === 200,
            { timeout: 15000 } // Tăng thời gian chờ lên 15 giây
        );
        
        const token = voiceListResponse.headers()['x-msttsaccesstoken'];

        if (token) {
            res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
            res.status(200).json({ success: true, token: token });
        } else {
            res.status(500).json({ success: false, message: 'Không thể tìm thấy token. API của Microsoft có thể đã thay đổi.' });
        }

    } catch (error) {
        console.error(error);
        // Cung cấp thông báo lỗi chi tiết hơn
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi phía máy chủ khi lấy token.', error: error.message });
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
};
