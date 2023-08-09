const express = require("express");
const app = express();
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config();

const { Configuration, OpenAIApi } = require("openai");
console.log("API kEY", process.env.API_KEY);

const config = new Configuration({
  apiKey: process.env.API_KEY,
});

const openai = new OpenAIApi(config);
app.use(bodyParser.urlencoded({ extended: false }));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("scrap", { subject: "", body: "" });
});

app.post("/generate-emails", async (req, res) => {
  console.log("Request Body:", req.body);
  try {
    const recipientWebsite = req.body.recipientWebsite;
    const recipientCompanyName = req.body.recipientCompanyName;
    const city = req.body.city;
    const recipientIndustryCategory = req.body.recipientIndustryCategory;
    const senderCompanyDetails = req.body.senderCompanyDetails;
    const senderValueProposition = req.body.senderValueProposition;
    const senderDesiredCallToAction = req.body.senderDesiredCallToAction;
    console.log("Recipient Website : ", recipientWebsite);
    console.log("Recipient Company Name : ", recipientCompanyName);
    console.log("Recipient Company Name :", recipientCompanyName);

    if (!recipientWebsite || !recipientCompanyName || !senderCompanyDetails) {
      console.log("Nothing found");
      return res.status(400).json({
        error:
          "Recipient Website, Recipient Company Name, and Sender Company Details are required",
      });
    }

    const recipientContent = await scrapeRecipientWebsite(recipientWebsite);

    console.log("Recepient Content", recipientContent);

    const prompt = preparePrompt(
      recipientContent,
      recipientCompanyName,
      city,
      recipientIndustryCategory,
      senderCompanyDetails,
      senderValueProposition,
      senderDesiredCallToAction
    );

    function separateSubjectAndBody(inputString) {
      const subjectRegex = /Subject: (.+)\n/;
      const subjectMatch = inputString.match(subjectRegex);

      if (subjectMatch && subjectMatch.length >= 2) {
        const subject = subjectMatch[1];
        const body = inputString.replace(subjectRegex, "");

        return {
          subject: subject.trim(),
          body: body
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .join("\n"),
        };
      } else {
        return {
          subject: "",
          body: inputString.trim(),
        };
      }
    }
    const generatedEmail = await generateEmailWithGPT4(prompt);

    const emailResult = separateSubjectAndBody(generatedEmail);
    console.log("the object form content", emailResult);
    let bodyOfMail = emailResult.body
      .split("\n")
      .map((line) => line.trim())
      .join("\n");
    const data = {
      Subject: emailResult.subject,
      Body: bodyOfMail,
    };
    console.log(data);
    res.render("scrap", { subject: data.Subject, body: data.Body });
    //res.json({subject :data.Subject, body :data.Body});
  } catch (error) {
    console.error("Error generating email:", error.message);
    res.status(500).json({ error: "Error generating email" });
  }
});

async function scrapeRecipientWebsite(website) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--enable-webgl",
      "--window-size=800,800",
    ],
  });
  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36";

  const page = await browser.newPage();
  await page.setUserAgent(ua);
  await page.setDefaultNavigationTimeout(60000);

  await page.goto(website);
  const recipientContent = await page.evaluate(() => document.body.innerText);

  await browser.close();
  return recipientContent;
}

function preparePrompt(
  recipientContent,
  recipientCompanyName,
  city,
  recipientIndustryCategory,
  senderCompanyDetails,
  senderValueProposition,
  senderDesiredCallToAction
) {
  const prompt = `Hello ${recipientCompanyName}, we are ${senderCompanyDetails}. ${senderValueProposition}... Make email subject and body also`;

  console.log("🚀 ..............:", prompt);

  return prompt;
}

async function generateEmailWithGPT4(prompt) {
  try {
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 2048,
      temperature: 1,
    });

    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error("Error generating email:", error);
    throw new Error("Failed to generate email");
  }
}

const port = 4200;
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
