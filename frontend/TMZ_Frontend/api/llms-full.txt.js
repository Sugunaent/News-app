import llmsHandler from './_llms.js';

export default function handler(request, response) {
  return llmsHandler(request, response, 'llms-full.txt');
}
