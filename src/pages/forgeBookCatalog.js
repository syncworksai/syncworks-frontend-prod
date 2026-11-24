// A 100-title *curriculum*, not 100 completed summaries.
// Full studies are written, sourced, reviewed and published individually.
// Modern copyrighted books receive original critical overviews, not reproductions.
const groups = {
  "Entrepreneurship": [
    ["The Millionaire Next Door","Thomas J. Stanley and William D. Danko"],
    ["The 4-Hour Workweek","Timothy Ferriss"],
    ["Atomic Habits","James Clear"],
    ["Good to Great","Jim Collins"],
    ["Zero to One","Peter Thiel and Blake Masters"],
    ["The Obstacle Is the Way","Ryan Holiday"],
    ["Ready, Fire, Aim","Michael Masterson"],
    ["Traction: Get a Grip on Your Business","Gino Wickman"],
    ["Awaken the Giant Within","Tony Robbins"]
  ],
  "Philosophy & Stoicism": [
    ["Meditations","Marcus Aurelius"],["Discourses","Epictetus"],["Letters from a Stoic","Seneca"],
    ["The Republic","Plato"],["The Apology of Socrates","Plato"],["Nicomachean Ethics","Aristotle"],
    ["The Analects","Confucius"],["Tao Te Ching","Laozi"],["The Enchiridion","Epictetus"],
    ["On the Shortness of Life","Seneca"]
  ],
  "Strategy & Power": [
    ["The Art of War","Sun Tzu"],["The Prince","Niccolò Machiavelli"],["The 48 Laws of Power","Robert Greene"],
    ["The 33 Strategies of War","Robert Greene"],["On War","Carl von Clausewitz"],
    ["The Book of Five Rings","Miyamoto Musashi"],["The Art of the Deal","Donald Trump and Tony Schwartz"],
    ["The Strategy of Conflict","Thomas Schelling"],["The Dictator's Handbook","Bruce Bueno de Mesquita and Alastair Smith"],
    ["The Art of Strategy","Avinash Dixit and Barry Nalebuff"]
  ],
  "Politics & Government": [
    ["The Federalist Papers","Hamilton, Madison and Jay"],["Democracy in America","Alexis de Tocqueville"],
    ["The Social Contract","Jean-Jacques Rousseau"],["Leviathan","Thomas Hobbes"],
    ["Second Treatise of Government","John Locke"],["On Liberty","John Stuart Mill"],
    ["The Road to Serfdom","F. A. Hayek"],["The Origins of Totalitarianism","Hannah Arendt"],
    ["The Righteous Mind","Jonathan Haidt"],["The Constitution of Liberty","F. A. Hayek"]
  ],
  "World History": [
    ["The Histories","Herodotus"],["History of the Peloponnesian War","Thucydides"],
    ["The Decline and Fall of the Roman Empire","Edward Gibbon"],["The Rise and Fall of the Third Reich","William L. Shirer"],
    ["SPQR","Mary Beard"],["Guns, Germs, and Steel","Jared Diamond"],
    ["Sapiens","Yuval Noah Harari"],["The Silk Roads","Peter Frankopan"],
    ["A People's History of the United States","Howard Zinn"],["Postwar","Tony Judt"]
  ],
  "Psychology & Human Behavior": [
    ["Thinking, Fast and Slow","Daniel Kahneman"],["Influence","Robert Cialdini"],
    ["Man's Search for Meaning","Viktor Frankl"],["The Laws of Human Nature","Robert Greene"],
    ["The Psychology of Money","Morgan Housel"],["Predictably Irrational","Dan Ariely"],
    ["Behave","Robert Sapolsky"],["The Happiness Hypothesis","Jonathan Haidt"],
    ["Mistakes Were Made (But Not by Me)","Carol Tavris and Elliot Aronson"],
    ["The Undoing Project","Michael Lewis"]
  ],
  "Science & Critical Thinking": [
    ["Philosophiæ Naturalis Principia Mathematica","Isaac Newton"],["Opticks","Isaac Newton"],
    ["The Demon-Haunted World","Carl Sagan"],["A Brief History of Time","Stephen Hawking"],
    ["The Structure of Scientific Revolutions","Thomas Kuhn"],["The Selfish Gene","Richard Dawkins"],
    ["The Feynman Lectures on Physics","Richard Feynman, Robert Leighton and Matthew Sands"],
    ["The Gene","Siddhartha Mukherjee"],["The Origin of Species","Charles Darwin"],
    ["The Beginning of Infinity","David Deutsch"]
  ],
  "Leadership & Business": [
    ["Good to Great","Jim Collins"],["The Effective Executive","Peter Drucker"],
    ["The Lean Startup","Eric Ries"],["High Output Management","Andrew Grove"],
    ["The Hard Thing About Hard Things","Ben Horowitz"],["Zero to One","Peter Thiel and Blake Masters"],
    ["The Innovator's Dilemma","Clayton Christensen"],["Made to Stick","Chip Heath and Dan Heath"],
    ["Never Split the Difference","Chris Voss and Tahl Raz"],["The Personal MBA","Josh Kaufman"]
  ],
  "Economics & Money": [
    ["The Wealth of Nations","Adam Smith"],["Capital in the Twenty-First Century","Thomas Piketty"],
    ["The General Theory of Employment, Interest and Money","John Maynard Keynes"],
    ["Economics in One Lesson","Henry Hazlitt"],["The Intelligent Investor","Benjamin Graham"],
    ["A Random Walk Down Wall Street","Burton Malkiel"],["The Ascent of Money","Niall Ferguson"],
    ["Poor Economics","Abhijit Banerjee and Esther Duflo"],["The Black Swan","Nassim Nicholas Taleb"],
    ["Antifragile","Nassim Nicholas Taleb"]
  ],
  "Communication & Vocabulary": [
    ["The Elements of Style","William Strunk Jr. and E. B. White"],["The Sense of Style","Steven Pinker"],
    ["How to Read a Book","Mortimer Adler and Charles Van Doren"],["The Art of Rhetoric","Aristotle"],
    ["Thank You for Arguing","Jay Heinrichs"],["On Writing Well","William Zinsser"],
    ["The Story of English","Robert McCrum, William Cran and Robert MacNeil"],
    ["Word Power Made Easy","Norman Lewis"],["The Elements of Eloquence","Mark Forsyth"],
    ["The Language Instinct","Steven Pinker"]
  ],
  "Character, Habits & Performance": [
    ["Atomic Habits","James Clear"],["Deep Work","Cal Newport"],["Grit","Angela Duckworth"],
    ["Flow","Mihaly Csikszentmihalyi"],["Peak","Anders Ericsson and Robert Pool"],
    ["The Inner Game of Tennis","W. Timothy Gallwey"],["Mindset","Carol Dweck"],
    ["The War of Art","Steven Pressfield"],["Essentialism","Greg McKeown"],
    ["The Power of Habit","Charles Duhigg"]
  ]
};
const stableId=(title)=>title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g,"").trim().replace(/ +/g,"-");
// An item may be highlighted in multiple subject areas but should appear as
// a single catalog record. Entrepreneurship takes priority for pictured picks.
const indexed=new Map();
Object.entries(groups).forEach(([category,books])=>
  books.forEach(([title,author])=>{
    const id=stableId(title);
    const prior=indexed.get(id);
    if(prior){prior.subjects.push(category);return;}
    indexed.set(id,{
      id,title,author,category,subjects:[category],
      studyId:title==="The Art of War"?"art-of-war-deep-study":null,
      status:title==="The Art of War"?"available":"planned",
    });
  })
);
export const forgeBookCatalog=[...indexed.values()];
export const forgeBookCategories=Object.keys(groups);
