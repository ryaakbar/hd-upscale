import axios from "axios";
import FormData from "form-data";
import { IncomingForm } from "formidable";
import fs from "fs";

// Disable default body parser - we handle multipart manually
export const config = {
    api: { bodyParser: false }
};

// Parse multipart form
function parseForm(req) {
    return new Promise((resolve, reject) => {
        const form = new IncomingForm({
            maxFileSize: 10 * 1024 * 1024, // 10MB
            keepExtensions: true
        });
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve({ fields, files });
        });
    });
}

async function fetchBuffer(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
        return Buffer.from(response.data);
    } catch (error) {
        throw new Error("Failed to download enhanced image");
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Parse uploaded file
        const { files } = await parseForm(req);
        const imageFile = files.image?.[0] || files.image;

        if (!imageFile) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const imageBuffer = fs.readFileSync(imageFile.filepath);
        const originalName = imageFile.originalFilename || 'image.jpg';

        // Build form for Pixelcut API
        const form = new FormData();
        form.append("image", imageBuffer, {
            filename: originalName,
            contentType: imageFile.mimetype || 'image/jpeg'
        });
        form.append("scale", "2");

        const headers = {
            ...form.getHeaders(),
            "accept": "application/json",
            "x-client-version": "web",
            "x-locale": "en",
        };

        // Call Pixelcut upscale API
        const apiRes = await axios.post(
            "https://api2.pixelcut.app/image/upscale/v1",
            form,
            { headers, timeout: 60000 }
        );

        const json = apiRes.data;
        if (!json.result_url) {
            throw new Error("API did not return result URL");
        }

        // Download the enhanced image
        const resultBuffer = await fetchBuffer(json.result_url);

        // Return image directly
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', `attachment; filename="hdupscale-enhanced.jpg"`);
        res.status(200).send(resultBuffer);

        // Cleanup temp file
        try { fs.unlinkSync(imageFile.filepath); } catch (e) {}

    } catch (error) {
        console.error('Upscale error:', error.message);
        return res.status(500).json({
            error: error.message || 'Enhancement failed'
        });
    }
}
