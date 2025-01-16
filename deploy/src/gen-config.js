const inquirer = require('inquirer');
const fs = require('node:fs');
const path = require('node:path');

const regions = [
  'nyc1',
  'sfo1',
  'nyc2',
  'ams2',
  'sgp1',
  'lon1',
  'nyc3',
  'ams3',
  'fra1',
  'tor1',
  'sfo2',
  'blr1',
  'sfo3',
  'syd1',
];
const sizes = [
  's-4vcpu-8gb',
  's-4vcpu-8gb-amd',
  's-4vcpu-8gb-intel',
  'g-2vcpu-8gb',
  's-4vcpu-8gb-240gb-intel',
  'gd-2vcpu-8gb',
  'g-2vcpu-8gb-intel',
  'gd-2vcpu-8gb-intel',
  's-4vcpu-16gb-amd',
  'm-2vcpu-16gb',
  'c-4',
  'c2-4vcpu-8gb',
  's-4vcpu-16gb-320gb-intel',
  's-8vcpu-16gb',
  'm3-2vcpu-16gb',
  'c-4-intel',
  // ... Include all sizes here
];

const questionService = {
  type: 'input',
  name: 'serviceName',
  message: 'What is the service name?',
};

const questionRegion = {
  type: 'list',
  name: 'region',
  message: 'Select the region:',
  choices: regions,
};

const questionSize = {
  type: 'list',
  name: 'size',
  message: 'Select the size:',
  choices: sizes,
};

inquirer
  .prompt([questionService, questionRegion, questionSize])
  .then((answers) => {
    const { serviceName, region, size } = answers;
    const outputTemplate = `
services:
  ${serviceName}:
    region: '${region}'
    size: '${size}'
      `;
    const outputPath = path.resolve(__dirname, 'config.user.yaml');
    fs.writeFileSync(outputPath, outputTemplate);
    console.log(`file generated at: ${path.resolve(outputPath)}`);
  });
