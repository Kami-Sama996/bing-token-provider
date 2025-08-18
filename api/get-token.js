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
        
        let token = null;
        // Lắng nghe các response từ trang web
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('edge.microsoft.com/speech/voices/list')) {
                const headers = response.headers();
                if (headers['x-msttsaccesstoken']) {
                    token = headers['x-msttsaccesstoken'];
                }
            }
        });

        // Điều hướng đến trang của Microsoft để kích hoạt việc tạo token
        await page.goto('https://support.microsoft.com/en-us/office/use-the-read-aloud-feature-to-listen-to-text-in-edge-32f2463a-3f3f-4e55-9781-54607b4c952b', {
            waitUntil: 'networkidle0'
        });

        await page.waitForTimeout(1000); // Đợi 1 giây để đảm bảo token đã được ghi nhận

        if (token) {
            res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate'); // Cache kết quả trong 10 phút
            res.status(200).json({ success: true, token: token });
        } else {
            res.status(500).json({ success: false, message: 'Không thể tìm thấy token. API của Microsoft có thể đã thay đổi.' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi phía máy chủ khi lấy token.' });
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
};
