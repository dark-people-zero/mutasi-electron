
const recognize = require("tesseractocr");
const im = require('imagemagick');
const fs = require("fs");

class CaptchaSolver {
	async convert(img) {
		return new Promise((resolve) => {
            im.convert([img, '-resize', '25x120', img], (error, stdout) => {
                if (error) console.warn(error);
                resolve(stdout ? stdout : null);
            });
		});
	}
    

	async solveOCR(img) {
		return new Promise((resolve, reject) => {
			recognize(
				img,
				{ psm: 7, config: "tessedit_char_whitelist=0123456789" },
				(err, text) => {
					if (err) {
						return reject(err);
					}
					resolve(text.trim());
				}
			);
		});
		
	}

	async readImg(img) {
		try {
			await this.convert(img);
			
			let response = await this.solveOCR(img);
			if (typeof response == 'string') return response.replace('S', '5');
			return response;
		} catch (err) {
			throw err;
		}
	}
	
	
	
	async file_to_base64_encode(filepath) {
		try {
			var bitmap = fs.readFileSync(filepath);
			// convert binary data to base64 encoded string
			return Buffer.from(bitmap).toString('base64');
		} catch (Error) {
			throw Error;
		}
	}

}

module.exports = CaptchaSolver;
