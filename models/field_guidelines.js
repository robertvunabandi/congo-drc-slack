let guidelines = "\n\n";

guidelines += `
  =======================================================
  *Expertise Input Guidelines*
  
  We would like to follow a consistent guideline for members' fields of expertise, so here they are:
  - You must enter your expertise in comma separated values. For example, 
  
    \`/set_expertise computer science, sports, ice-skating\`.
  
  - Each field _must_ contain only characters from the alphabet in addition to `;
guidelines += `hyphens (-) and empty spaces ( ). If your fields contain anything else `;
guidelines += `(no numbers allowed), your request will not be accepted.

  Please follow this guideline. To add your expertise, simply type \`/set_expertise\``;
guidelines += `in any Slack channel, followed by a list of fields in which `;
guidelines += `you consider yourself an expert. 

  If you have any concern or feedback, please contact <@U9ZAM86KC>.
  
  `;
guidelines += "In addition, the Github repository for this project (if you are interested in ";
guidelines += "participating in building the software for this Slack application) is";
guidelines += `https://github.com/robertvunabandi/congo-drc-slack 

  _Thank you for your cooperation!_
  =======================================================`;
module.exports = guidelines;