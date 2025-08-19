const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chrome-aws-lambda');

// Hàm handler chính của Vercel Serverless Function
module.exports = async (req, res) => {
    let browser = null;
    try {
        // Khởi tạo trình duyệt ảo với các thiết lập mới nhất
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
        let token = null;
        // Bắt đầu "lắng nghe" các yêu cầu mạng của trang
        page.on('response', async (response) => {
            const url = response.url();
            // Đây là URL mục tiêu chứa TrustedClientToken
            if (url.includes('edge.microsoft.com/speech/voices/list')) {
                const headers = response.headers();
                if (headers['x-msttsaccesstoken']) {
                    token = headers['x-msttsaccesstoken'];
                }
            }
        });

        // Điều hướng đến một trang hỗ trợ của Microsoft để kích hoạt việc tạo token
        await page.goto('https://support.microsoft.com/en-us/office/use-the-read-aloud-feature-to-listen-to-text-in-edge-32f2463a-3f3f-4e55-9781-54607b4c952b', {
            waitUntil: 'networkidle0' // Đợi cho đến khi mạng gần như không hoạt động
        });

        // Đợi một chút để đảm bảo sự kiện 'response' đã được xử lý
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (token) {
            // Trả về token nếu thành công
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
