const express = require('express');
const { Leetcode } = require('@codingsnack/leetcode-api');
const cheerio = require('cheerio');
require('dotenv').config()

const app = express();
const port = 4000;

// Middleware to parse JSON bodies
app.use(express.json());

// GET route for '/'
app.get('/', (req, res) => {
  res.send('Working');
});

// POST route for '/getquestion'
app.post('/getquestion', async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question parameter is required' });
  }

  try {
    const questionObject = await main(question);
    res.json(questionObject);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching the question' });
  }
});

// The main function to fetch and parse LeetCode question
const main = async (question) => {
  try {
    const csrfToken = process.env.CSRF;
    const session = process.env.LEETCODE_SESSION;

    const lc = new Leetcode({ csrfToken, session });

    const problem = await lc.getProblem(question);
    const $ = cheerio.load(problem.content);

    function extractTextFromHtml(html) {
      const $ = cheerio.load(html);
      return $.text().trim(); 
    }

    const questionObject = {
      id: problem.questionId,
      title: problem.title,
      difficulty: problem.difficulty,
      question: extractTextFromHtml($.html()).split('Example 1:')[0],
      examples: [],
      constraints: extractConstraints($),
    };

    $('p:contains("Example")').each((index, element) => {
      if ($(element).next('img').attr('src')) {
        const exampleImage = $(element).next('img').attr('src') || 'No image';
        const exampleText = $(element).next('img').next('pre').text() || 'No text';
        questionObject.examples.push({ text: exampleText, image: exampleImage });
      } else {
        const exampleText = $(element).next('pre').text() || 'No text';
        questionObject.examples.push({ text: exampleText, image: "" });
      }
    });

    function extractConstraints($) {
      const constraintsHtml = $('p:contains("Constraints")').next('ul').html();
      if (constraintsHtml) {
        const constraintsText = constraintsHtml.replace(/<sup>(.*?)<\/sup>/g, '^$1');
        const constraintsList = cheerio.load(constraintsText)('li').map((i, el) => $(el).text()).get();
        return constraintsList.join('\n');
      }
      return '';
    }

    return questionObject;
  } catch (error) {
    throw error;
  }
};

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});