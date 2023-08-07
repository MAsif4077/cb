const express = require("express");
const app = express();
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");

const { Configuration, OpenAIApi } = require("openai");

const config = new Configuration({
  apiKey: "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",
});

const openai = new OpenAIApi(config);
app.use(bodyParser.urlencoded({ extended: false }));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("scrap", { result: "" });
});

app.post("/generate-emails", async (req, res) => {
  console.log("Request Body:", req.body);
  try {
    const recipientWebsite = req.body.website;
    const recipientCompanyName = req.body.companyName;
    const city = req.body.city;
    const recipientIndustryCategory = req.body.category;
    const senderCompanyDetails = req.body.SenderCompanyDetails;
    const senderValueProposition = req.body.senderValueProp;
    const senderDesiredCallToAction = req.body.sendDesiredCall;

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
    res.render("scrap", { result: data });
  } catch (error) {
    console.error("Error generating email:", error.message);
    res.status(500).json({ error: "Error generating email" });
  }
});

async function scrapeRecipientWebsite(website) {
  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();

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
