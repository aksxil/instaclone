const nodemailer = require("nodemailer");
const googleapis = require("googleapis");

const REDIRECT_URL = `https://developers.google.com/oauthplayground`;
const CLIENT_ID = `408289386252-ind6l7jcov0vkti5gg3rr7b0iohufo9h.apps.googleusercontent.com`;
const CLIENT_SECRETE = `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`;
const REFRESH_TOKEN =`1//04S8zfwDCgsP_CgYIARAAGAQSNwF-L9IrWOTphQ-18yOK2icLS-Jbx54r7dw5Dq7SsrDF-4LKQU0ODhh7I2CuaHMW6vbApkjbBxQ`;

const authClient = new googleapis.google.auth.OAuth2(CLIENT_ID,CLIENT_SECRETE,REDIRECT_URL);
authClient.setCredentials({refresh_token: REFRESH_TOKEN});

async function mailer(receiver, userId, key){
    try{
        const ACCESS_TOKEN = await authClient.getAccessToken();

        const transport = nodemailer.createTransport({
            service: "gmail",
            auth:{
                type:"OAuth2",
                user:"aksx3u@gmail.com",
                clientId:CLIENT_ID,
                clientSecret:CLIENT_SECRETE,
                refreshToken:REFRESH_TOKEN,
                accessToken: ACCESS_TOKEN
            }
        })
        const details = {
            from: "Aakash Nishad <aksx3u@gmail.com>",
            to: receiver,
            subject: "RESET PASSWORD",
            text:"text msg by sastafbook",
            html:`<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f4;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #ffffff;
                        border: 1px solid #ccc;
                        border-radius: 5px;
                    }
                    h2 {
                        color: #333;
                        margin-bottom: 20px;
                    }
                    p {
                        font-size: 16px;
                        line-height: 1.6;
                        margin-bottom: 20px;
                    }
                    .btn {
                        display: inline-block;
                        padding: 10px 20px;
                        font-size: 16px;
                        text-align: center;
                        text-decoration: none;
                        background-color: #007BFF;
                        color: #fff;
                        font-weight:600;
                        border-radius: 5px;
                        cursor: pointer;
                    }
                    .btn:hover {
                        background-color: #0056b3;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Password Reset</h2>
                    <p>You have requested a password reset for your account on SastaInsta. Click the button below to reset your password:</p>
                    <a href="http://localhost:3000/reset/${userId}/${key}" class="btn">Reset Password</a>
                    <p>If you did not request a password reset, please ignore this email.</p>
                    <p>Thank you,</p>
                    <p>The SastaInsta Team</p>
                </div>
            </body>
            </html>
            `
            // html: `<a href="http://localhost:3000/reset/${userId}/${key}">http://localhost:3000/forgot/${userId}/${key}</a>`
        }
        const result = await transport.sendMail(details);
        return result;
    }
    catch(err){
        return err;
    }
}

// mailer().then(res =>{
//     console.log("send mail", res);
// })

module.exports = mailer;