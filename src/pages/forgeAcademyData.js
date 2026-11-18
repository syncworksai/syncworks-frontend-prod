// Original adult continuing-education lessons. Source URLs are further reading,
// not copyrighted book text. No live market signals or personalized advice.
export const academyTracks = [
  {id:"trading",title:"Day Trading & Market Structure",icon:"chart",description:"Market mechanics, risk, probability, execution and journals."},
  {id:"finance",title:"Finance & Wealth",icon:"wallet",description:"Cash flow, interest, investing, debt, taxes and financial judgment."},
  {id:"mortgages",title:"Mortgages & Real Estate",icon:"house",description:"Loan structure, closing documents, rental economics and leverage."},
  {id:"teams",title:"Team Building & Leadership",icon:"users",description:"Hiring, delegation, communication, feedback and organizational systems."},
  {id:"psychology",title:"Relationships & Human Psychology",icon:"heart",description:"Attachment, emotions, motivation, boundaries, needs and identity."},
  {id:"power",title:"Power, Roles & Consent",icon:"shield",description:"Dominance, submission, influence and negotiated power dynamics."},
  {id:"thinking",title:"Reasoning & Political Literacy",icon:"brain",description:"Logical fallacies, evidence, institutions and competing arguments."},
  {id:"communication",title:"Vocabulary & Communication",icon:"book",description:"Precision, persuasion, rhetoric and confident everyday speech."}
];
export const academyLessons = [
  {
    id:"trade-expectancy",track:"trading",order:1,title:"Why a Good Trade Can Lose",minutes:18,
    objectives:["Separate process quality from trade outcome","Calculate expectancy in R units","Explain position risk before an entry"],
    sections:[
      {heading:"Outcome is not the same as quality",text:"A trader can follow a reasonable, written plan and lose money on an individual position. Conversely, a reckless decision can profit by chance. This is the distinction between outcome quality and decision quality. Evaluate the setup, position size, invalidation point, and execution before you evaluate the profit. Without that distinction, winning trades can reinforce dangerous habits and ordinary losses can destroy confidence."},
      {heading:"Build a probabilistic framework",text:"A trading strategy must be evaluated over a meaningful sample, including realistic fees and slippage. One common representation is expectancy: (win rate × average win) minus (loss rate × average loss). If wins occur 40% of the time at 2R and losses occur 60% at 1R, the arithmetic expectancy is 0.2R per trade before costs. R means the amount risked per trade. Positive expectancy is a mathematical description of past or assumed outcomes, not a guarantee that future results will match them."},
      {heading:"Your risk comes first",text:"Before entering, identify what would prove the trade thesis wrong, what happens if the market moves quickly, and whether position sizing fits your overall loss limits. Leverage amplifies both gains and losses. Stop orders can execute at unexpected prices in fast markets. A profitable-looking strategy can fail if a sequence of losses makes the account or the trader unable to continue. Practice in simulation first; compare planned risk against realized risk, and record when you violated your rules."},
      {heading:"Reflective practice",text:"Create two journal columns: 'Was my process sound?' and 'What was the financial result?' A perfect process will not guarantee a profitable trade; however, separating these measures makes feedback useful. At the end of a week, examine repeated entry mistakes and whether fees, slippage, and overtrading changed your results. The goal of this lesson is not to trade more often. It is to judge the quality of a decision with evidence rather than excitement."}
    ],
    terms:[["Expectancy","Average expected result over a defined set of assumptions."],["R-multiple","Profit or loss measured relative to initial risk."],["Slippage","Difference between expected and executed price."]],
    question:{prompt:"A trader followed the plan perfectly but lost 1R. What should they conclude?",options:["The trade was automatically a mistake","A single losing result does not prove the decision process was poor","They should double size to recover"],correct:1,why:"A sound process can lose on any individual trade. Review a meaningful sample and actual execution."},
    practice:"Review five simulated trades and score process adherence separately from profit.",
    source:{label:"FINRA — Day trading risks",url:"https://www.finra.org/investors/investing/investment-products/stocks/day-trading"},
    caution:"Education only; no trade signal or promise of returns."
  },
  {
    id:"trade-market-context",track:"trading",order:2,title:"Market Context Before Entry",minutes:15,
    objectives:["Distinguish trend from range","Identify liquidity and event risks","Write a falsifiable setup"],
    sections:[
      {heading:"Begin with the environment",text:"A chart pattern does not exist in a vacuum. Ask whether the broader market is trending, ranging, or reacting to economic news. A technique that performed well during a directional session may perform poorly when prices repeatedly return to a narrow range. Context does not predict the future; it helps specify the conditions in which your plan is designed to operate."},
      {heading:"Liquidity and scheduled events",text:"Spreads, order-book depth and price volatility can change quickly around market opens and major data releases. A stop order may execute far from its trigger when liquidity thins. Reviewing an economic calendar before trading prevents you from confusing a major announcement with an ordinary technical breakout. If you cannot explain the conditions, doing nothing is a legitimate decision."},
      {heading:"Turn conviction into a test",text:"Instead of saying 'this looks bullish,' write a scenario: 'If price closes above a defined level with broader trend alignment, I will consider an entry. If the level fails, the thesis is invalid.' Then specify risk and exit criteria. A falsifiable setup tells you what evidence would make you change your mind. The ability to do that is part of disciplined learning, not a weakness."}
    ],
    terms:[["Liquidity","Ease of entering or exiting a position without substantial price impact."],["Regime","A set of prevailing market conditions."],["Invalidation","Observable evidence that conflicts with a trade thesis."]],
    question:{prompt:"Why review the economic calendar before a trading session?",options:["It guarantees the market direction","It identifies scheduled events that may alter volatility and execution risk","It replaces risk management"],correct:1,why:"Scheduled economic releases can affect liquidity and volatility without revealing a certain direction."},
    practice:"Write one trading scenario with conditions, invalidation, risk and a no-trade condition.",
    source:{label:"CFTC — Investor advisories",url:"https://www.cftc.gov/LearnAndProtect/AdvisoriesAndArticles/index.htm"},
    caution:"Simulated practice; no live orders."
  },
  {
    id:"money-cashflow",track:"finance",order:1,title:"Cash Flow Is Not Wealth",minutes:18,
    objectives:["Separate income, profit and cash flow","Use an emergency-fund framework","Identify opportunity costs"],
    sections:[
      {heading:"Three measures that are not interchangeable",text:"Revenue measures money earned from customers before expenses. Profit accounts for costs recognized within a period. Cash flow measures money actually moving in and out. A business can show a profit while unpaid invoices leave it short of cash. A rental owner can collect monthly rent yet face a roof replacement, vacancy or delayed payments. Personal income can look strong while debt payments and irregular bills eliminate financial flexibility."},
      {heading:"Build a durable foundation",text:"Start with essential commitments, recurring income, irregular expenses and high-interest debt. An emergency reserve should be chosen based on the stability of your cash flow, family needs and access to resources; a fixed one-size-fits-all number is less useful than understanding the risks. Automatic saving helps some households, but it should not make necessary bills harder to pay. For long-term investing, compound returns can grow wealth, yet market losses remain possible."},
      {heading:"The value of options",text:"A purchase has more than a sticker price. It has financing costs, maintenance, insurance, opportunity cost and effects on your future flexibility. A successful-looking purchase might make you less free if it creates obligations that force undesirable work. A modest decision can sometimes increase freedom by reducing pressure. Judge wealth partly by resilience and the choices it allows—not merely status or appearance."}
    ],
    terms:[["Liquidity","Availability of cash or assets easily converted into cash."],["Opportunity cost","Value of the best foregone alternative."],["Net worth","Assets minus liabilities."]],
    question:{prompt:"A company reports profit, but customers have not paid their invoices. What can still be strained?",options:["Cash flow","The name of the company","Its legal registration"],correct:0,why:"Revenue recognition and payment timing differ; liquidity can be weak even when accounting profit is positive."},
    practice:"Separate personal and business inflows, essential outflows, irregular expenses and reserves on one page.",
    source:{label:"Investor.gov — Introduction to investing",url:"https://www.investor.gov/introduction-investing"},
    caution:"General education, not individualized financial advice."
  },
  {
    id:"money-compounding",track:"finance",order:2,title:"Interest, Debt & Compounding",minutes:16,
    objectives:["Explain compound growth","Compare cost of debt to uncertain investment returns","Recognize the role of time horizon"],
    sections:[
      {heading:"Compounding in two directions",text:"When returns remain invested, future gains may be earned on previous gains as well as the original contribution. This is compounding. The same structure works against you when unpaid debt accumulates interest. The advertised annual rate is not enough to tell the full story: compounding frequency, fees, payment timing and whether a rate can change all matter."},
      {heading:"Guaranteed costs versus uncertain returns",text:"Paying down high-interest debt can reduce a known financing cost, whereas an investment return is uncertain. That does not mean all debt must always be eliminated before investing; employer benefits, liquidity and the type of debt may change the decision. What matters is comparing alternatives honestly and avoiding claims that market gains will certainly outrun borrowing costs."},
      {heading:"Time horizon and asset allocation",text:"Money needed soon for essential obligations typically calls for a different risk approach than money invested over decades. Diversification spreads exposure across assets or sectors but cannot prevent all losses. A good plan explains what each pool of money is for and what loss it could tolerate without endangering the goal."}
    ],
    terms:[["Compounding","Growth that accumulates on prior growth."],["APR","Annual percentage rate reflecting borrowing cost under applicable rules."],["Time horizon","Length of time until money is needed."]],
    question:{prompt:"Which statement about diversification is best supported?",options:["It eliminates all investment losses","It may reduce concentration risk but cannot guarantee profits","It guarantees a higher return"],correct:1,why:"Diversification can manage concentration risk without ensuring gains."},
    practice:"Compare the total cost of a hypothetical loan with a range of uncertain investment outcomes; write the assumptions.",
    source:{label:"Investor.gov — Asset allocation and diversification",url:"https://www.investor.gov/introduction-investing/getting-started/asset-allocation"},
    caution:"Use current lender documents and professional advice for specific decisions."
  },
  {
    id:"mortgage-loan-estimate",track:"mortgages",order:1,title:"How to Read a Mortgage Offer",minutes:20,
    objectives:["Identify payment components","Compare Loan Estimates","Distinguish nominal rate from APR"],
    sections:[
      {heading:"The loan is more than the rate",text:"A mortgage has principal, interest, term, closing costs and sometimes mortgage insurance. The monthly housing obligation may also include property taxes, homeowners insurance and association dues. A loan with a lower interest rate can still be more expensive over a particular time horizon if it requires larger upfront costs. Avoid comparing offers using the monthly principal-and-interest payment alone."},
      {heading:"Learn the Loan Estimate",text:"For many U.S. mortgages, the Loan Estimate is a standardized three-page form sent after application. Compare offers using the same loan amount, property assumptions and rate-lock situation. Review interest rate, projected payments, origination charges, services you can and cannot shop for, prepaid costs, escrow, cash to close and the comparison figures. Ask which fees may change and under what circumstances."},
      {heading:"APR and points",text:"APR attempts to express borrowing costs in a standardized annualized form, including certain charges. It is useful for comparison but does not replace examining cash-to-close, mortgage insurance, and likely time in the property. Buying discount points trades an upfront expense for a lower rate; whether that is worthwhile depends on when you refinance or sell, as well as the actual offer. Real decisions require reading lender disclosures."}
    ],
    terms:[["Amortization","Paying down a loan over time through scheduled payments."],["APR","Annual percentage rate including certain loan costs."],["Escrow","Account used to collect funds for expenses such as taxes and insurance."]],
    question:{prompt:"When comparing mortgages, which is the strongest approach?",options:["Compare interest rates only","Compare the full Loan Estimates using aligned assumptions","Pick the lowest initial monthly payment"],correct:1,why:"The overall cost involves rate, upfront fees, loan structure, insurance and cash to close."},
    practice:"Download a blank Loan Estimate and circle the interest rate, APR, total monthly payment and cash-to-close.",
    source:{label:"CFPB — Loan Estimate explainer",url:"https://www.consumerfinance.gov/owning-a-home/loan-estimate/"},
    caution:"Requirements vary by product and jurisdiction."
  },
  {
    id:"mortgage-rental-leverage",track:"mortgages",order:2,title:"Rental Returns & the Cost of Leverage",minutes:18,
    objectives:["Distinguish rent from net cash flow","Explain vacancy and reserve risk","Identify leverage's two-sided effects"],
    sections:[
      {heading:"Rent is the starting point",text:"Gross rental income is not what you keep. Budget for property taxes, insurance, repairs, maintenance, management, vacancy, capital expenditures and debt service. Some costs arrive in large irregular intervals. A property can appear profitable in a month without repairs and still lose money over an entire year if reserves are ignored."},
      {heading:"Leverage magnifies outcomes",text:"Borrowing can allow ownership of an asset with less initial cash, potentially increasing returns on equity when values and cash flows move favorably. It also creates fixed payment obligations even during vacancies or declines. A line of credit introduces additional rate and repayment terms. Assess the downside scenario, not just the expected rent."},
      {heading:"Plan with scenarios",text:"Instead of one optimistic forecast, compare a base case, several months of vacancy, and a major repair. Record which bills must still be paid. A reserve policy is a tool for resilience. Real estate wealth comes from sound acquisition, operating discipline, financing decisions and time—not merely a large number on a property-value estimate."}
    ],
    terms:[["Net operating income","Property income minus operating expenses, before financing and certain other items."],["Leverage","Use of borrowed funds to finance an asset."],["Vacancy rate","Share of rental time or units not generating rent."]],
    question:{prompt:"Which cost should be included in a long-term rental plan?",options:["Only the mortgage payment","Repairs, vacancy and future capital expenses","Only expenses incurred this month"],correct:1,why:"Irregular expenses and vacancies materially affect long-term cash flow."},
    practice:"Create base, vacancy and repair scenarios for a hypothetical rental without entering sensitive tenant information.",
    source:{label:"CFPB — Mortgage resources",url:"https://www.consumerfinance.gov/know-before-you-owe/"},
    caution:"No individualized mortgage, legal, tax or investment advice."
  },
  {
    id:"team-delegation",track:"teams",order:1,title:"Building a Team That Can Operate Without You",minutes:20,
    objectives:["Differentiate delegation from abdication","Define ownership and decision rights","Design a useful feedback loop"],
    sections:[
      {heading:"The founder trap",text:"When a business begins, the founder often performs every function. That creates speed at first: questions are answered quickly and priorities are known to one person. At scale, the same structure becomes a bottleneck. A healthy team needs clarity about what outcomes matter, who owns each decision, what resources are available and how issues escalate."},
      {heading:"Delegate outcomes, not just tasks",text:"'Handle customers' is vague. 'Respond to new service requests within the stated service window, document status accurately, and escalate safety issues immediately' defines an outcome and constraints. Explain why the work matters and what trade-offs the person may decide independently. Delegation is not abandonment; scheduled reviews and accessible support let someone improve without requiring constant permission."},
      {heading:"Make handoffs observable",text:"A team workflow should show when ownership passes from one person to another. For example, intake establishes requirements, dispatch assigns work, the technician updates completion and accounting verifies the invoice. A dashboard can help, but software will not cure unclear authority or mistrust. Establish definitions and then choose tools that make them visible."},
      {heading:"Develop judgment",text:"Do not reward only speed or obedience. Ask team members how they weighed alternatives and what they learned when an approach failed. Encourage respectful dissent when facts contradict a plan. Leaders create capability when they share context, give actionable feedback, and make it safe to identify defects before customers do."}
    ],
    terms:[["Delegation","Transfer of responsibility with defined authority and accountability."],["Escalation","Passing a decision or issue to an appropriate higher level."],["Decision rights","Explicit authority to make particular choices."]],
    question:{prompt:"Which instruction is most effective when delegating?",options:["Do everything exactly how I would","Own the outcome, operate within clear constraints, and escalate defined exceptions","Wait for approval on every small step"],correct:1,why:"Clear outcomes and decision rights reduce bottlenecks while preserving accountability."},
    practice:"Write one role card: mission, three outcomes, decisions allowed and escalation triggers.",
    source:{label:"MIT Sloan Management Review",url:"https://sloanreview.mit.edu/"},
    caution:"Leadership strategies depend on team and context."
  },
  {
    id:"team-feedback",track:"teams",order:2,title:"Feedback, Trust & High Standards",minutes:15,
    objectives:["Offer specific behavioral feedback","Separate standards from intimidation","Invite disagreement safely"],
    sections:[
      {heading:"Clarity is more useful than force",text:"People rarely improve from vague labels such as 'lazy' or 'not a leader.' Describe an observable behavior, its consequence and a practical change. For example: 'The customer did not receive a schedule update by the promised time. Let's define the notification step and who owns it.' This makes feedback actionable rather than personal."},
      {heading:"Trust and accountability coexist",text:"Psychological safety does not mean ignoring poor performance. It means people can identify mistakes, ask questions and disagree respectfully without humiliation. Accountability means commitments have consequences and the team evaluates results honestly. Both are required for reliable operations."},
      {heading:"Coach toward autonomy",text:"Ask a colleague to propose a solution before providing yours. Teach the decision framework rather than withholding information to maintain authority. Set review points and recognize improved reasoning. A strong team should become less dependent on any one person as skills and shared understanding grow."}
    ],
    terms:[["Psychological safety","A shared belief that interpersonal risk, such as asking questions, is relatively safe."],["Accountability","Responsibility for commitments and results."],["Specificity","Precision about observable behavior and expectations."]],
    question:{prompt:"Which feedback is most likely to help improvement?",options:["You're unreliable","Yesterday's status update was late; let's fix its trigger and ownership","I am disappointed in your personality"],correct:1,why:"Specific and observable feedback gives a clear path to improvement."},
    practice:"Rewrite three vague criticisms as observations, impacts and next actions.",
    source:{label:"Harvard Business Review — Management",url:"https://hbr.org/topic/subject/management"},
    caution:"Avoid humiliation or coercion as a management technique."
  },
  {
    id:"psych-attachment",track:"psychology",order:1,title:"Why We Seek Closeness, Space & Reassurance",minutes:20,
    objectives:["Describe attachment as a framework, not a diagnosis","Separate emotion from behavior","Practice respectful requests"],
    sections:[
      {heading:"Patterns emerge for reasons",text:"Humans learn expectations about closeness, safety and reliability through experience. Attachment research offers useful concepts for exploring patterns of seeking reassurance, distancing during stress, or feeling comfortable with interdependence. It does not license labeling a partner from one conversation. People may respond differently across situations and relationships, and patterns can change."},
      {heading:"Interpretation sits between events and reactions",text:"Imagine a partner does not reply to a message. One person sees an ordinary delay; another feels rejected. The event is the same, but the interpretations differ. That does not mean the hurt is imaginary. It means the feeling may contain both valid needs and assumptions worth examining. Asking 'What else could explain this?' creates space for curiosity before accusation."},
      {heading:"From mind-reading to requests",text:"A practical conversation names an observation and a need without issuing a verdict about the other person's intentions. 'When plans change without notice, I feel unsettled. Could we agree on a quick check-in?' allows a response. If the request is refused, you still need boundaries and choices. No single communication technique can make another person reciprocate or care."},
      {heading:"Self-knowledge without stereotypes",text:"Psychological preferences vary greatly within gender groups. Avoid treating men, women or other people as inherently wired for a fixed relationship role. History, culture, temperament, trust and personal values matter. Curiosity about individual differences builds understanding; confident-sounding generalizations can obscure it."}
    ],
    terms:[["Attachment","A framework for patterns of closeness and perceived security."],["Attribution","Explanation assigned to someone else's behavior."],["Co-regulation","Ways people may help one another manage distress through supportive interaction."]],
    question:{prompt:"A delayed reply makes someone feel rejected. What is a useful first step?",options:["Assume the partner intended disrespect","Examine alternative explanations and communicate a specific need","Label the partner with a diagnosis"],correct:1,why:"Observations and emotions are real; assumptions about motives should be tested."},
    practice:"Write one example as fact, interpretation, feeling, need and respectful request.",
    source:{label:"APA — Relationships resources",url:"https://www.apa.org/topics/relationships"},
    caution:"General psychology education, not therapy or diagnosis."
  },
  {
    id:"psych-values",track:"psychology",order:2,title:"Why We Like What We Like",minutes:17,
    objectives:["Explore reward and learning influences","Distinguish preference from obligation","Question personal narratives"],
    sections:[
      {heading:"Preferences do not have one cause",text:"What attracts us to a career, sport, style or relationship can involve temperament, past experiences, emotional associations, role models, social groups and simple familiarity. A favorite activity may be rewarding for physical sensations, mastery, belonging or identity. Reducing all preference to childhood or biology offers a neat story but usually more certainty than evidence allows."},
      {heading:"Reward, habit and identity",text:"Repeated behavior can become more automatic when cues reliably predict a reward. Yet the reward may not be obvious. Someone may enjoy competitive sport for excellence, friendly rivalry or relief from rumination. Someone may prefer formal clothing for craftsmanship or for the feeling of being prepared. Ask what feeling the activity promises and whether it delivers a result you value over time."},
      {heading:"Values offer a better test than image",text:"A person can sincerely value achievement and also value family, humility, curiosity or rest. When goals collide, identity narratives are tested. Rather than 'I am the sort of person who never stops,' ask whether the specific decision serves the values you want to live by. A preference can be meaningful without being compulsory."}
    ],
    terms:[["Reinforcement","A consequence that increases the likelihood of a behavior."],["Identity narrative","The story someone tells about who they are."],["Intrinsic motivation","Motivation linked to inherent interest or enjoyment."]],
    question:{prompt:"Which claim about preferences is most defensible?",options:["Each preference has one hidden cause","Preferences can reflect multiple biological, learned and social influences","Preferences can never change"],correct:1,why:"Human motivations are multifactorial and context dependent."},
    practice:"Select one strong preference and list three plausible influences and one value it may serve.",
    source:{label:"APA — Psychology topics",url:"https://www.apa.org/topics"},
    caution:"Avoid treating broad frameworks as personal diagnoses."
  },
  {
    id:"power-consent",track:"power",order:1,title:"Dominance, Submission & Negotiated Roles",minutes:21,
    objectives:["Distinguish influence from coercion","Explain enthusiastic ongoing consent","Examine power dynamics without gender assumptions"],
    sections:[
      {heading:"Power exists in more than one form",text:"Power can mean authority to make decisions, control of resources, social influence or the ability to set boundaries. In a workplace, authority is often attached to a role and formal accountability. In a personal relationship, one partner may prefer taking initiative in some settings while the other enjoys yielding control in those specific situations. Preferences alone do not establish character or superiority. They do not make anyone entitled to another person's obedience."},
      {heading:"Why roles can appeal",text:"Some people find structure reassuring, enjoy decisiveness, or appreciate having certain responsibilities handled by someone they trust. Others value autonomy, collaboration or the experience of temporarily relinquishing control in a mutually chosen situation. Motivations vary, and no role can be reliably predicted from gender, upbringing or a single personality score. An honest question is what experience the role provides—security, trust, relief, playfulness, or identity—and whether both people find it beneficial."},
      {heading:"Consent is a continuing process",text:"Mutually negotiated power dynamics require informed, voluntary and specific agreement. Someone can change their mind. Consent to one behavior does not imply consent to another, and silence or fear is not meaningful agreement. Check-ins and clear boundaries are especially important when power imbalances involve finances, housing, employment or emotional dependence. An agreed preference should never be used to isolate, threaten or deny another person access to help."},
      {heading:"Healthy authority has limits",text:"Leadership and intimacy sometimes use similar words—trust, confidence, surrender, responsibility—but they are not interchangeable institutions. A supervisor has duties under law and organizational policy. A partner has their own autonomy regardless of preferred roles. A person with greater influence carries more responsibility to notice pressure and invite honest disagreement. If someone cannot safely say no, the relationship is not operating on equal freedom to choose."}
    ],
    terms:[["Consent","Freely given, informed and specific agreement that can be withdrawn."],["Coercion","Pressure or threats that undermine free choice."],["Power asymmetry","Uneven control over resources, decisions or consequences."]],
    question:{prompt:"What best distinguishes consensual role preferences from coercion?",options:["The most confident person decides","Both parties can freely agree, refuse or withdraw without punishment","One role always belongs to a particular gender"],correct:1,why:"Ongoing voluntary choice and respect for boundaries are essential."},
    practice:"Write a boundary statement that respects both people's freedom to choose or decline.",
    source:{label:"RAINN — Consent",url:"https://rainn.org/articles/what-is-consent"},
    caution:"Educational discussion of adult relationships; never a justification for coercion or abuse."
  },
  {
    id:"thinking-circular",track:"thinking",order:1,title:"Circular Reasoning, Evidence & Belief",minutes:19,
    objectives:["Identify circular arguments","Differentiate claims from evidence","Construct a falsifiable question"],
    sections:[
      {heading:"When the argument assumes its conclusion",text:"Circular reasoning occurs when an argument depends on the very claim it seeks to prove. Consider: 'This strategy works because it is effective.' The wording provides no independent evidence. A subtler example is 'He must be trustworthy because he is an honest person,' when honesty is the unproven assertion. Repetition or certainty can make the conclusion feel more secure without adding support."},
      {heading:"Look for an independent test",text:"A useful response is to ask: what evidence would we expect to see if this were true, and what observation would count against it? For a claim about business productivity, compare defined outcomes over time and account for other changes. For historical claims, evaluate primary records, context and scholarly disagreement. For political claims, distinguish predictions from values and identify plausible alternative explanations."},
      {heading:"Beware motivated reasoning",text:"People often defend beliefs tied to identity more strongly than ordinary factual claims. Recognizing this does not make you immune. Try arguing the strongest version of a view you disagree with, then identify what both sides would accept as reliable evidence. This technique should not erase moral differences or pretend all claims are equally supported. It should make the disagreement clearer."},
      {heading:"Think in degrees of confidence",text:"Knowledge does not require certainty about everything. State the claim, evidence, limitations and current confidence. New evidence should sometimes change that confidence. A mature thinker can say 'I don't know yet' without feeling diminished. Intellectual authority is earned through reliable methods, not volume or aggression."}
    ],
    terms:[["Circular reasoning","An argument that relies on the conclusion it purports to establish."],["Falsifiability","Whether a claim could in principle conflict with evidence."],["Steelman","Constructing the strongest reasonable version of an opposing argument."]],
    question:{prompt:"Which statement contains circular reasoning?",options:["The evidence shows the process shortened delays","The rule is correct because it is the right rule","The records are incomplete, so confidence is limited"],correct:1,why:"'Correct because it is right' simply restates the claim."},
    practice:"Take a strong opinion and list two independent facts that support it, one challenge and what would change your view.",
    source:{label:"Stanford Encyclopedia of Philosophy — Fallacies",url:"https://plato.stanford.edu/entries/fallacies/"},
    caution:"Analytical skill, not a test of political allegiance."
  },
  {
    id:"communication-precision",track:"communication",order:1,title:"Speak With Precision Rather Than Noise",minutes:15,
    objectives:["Replace vague claims with specific language","Define key terms before debate","Explain a concept using examples"],
    sections:[
      {heading:"Clarity is a form of respect",text:"A confident speaker does not need the longest sentence or the most obscure vocabulary. The purpose is to make an idea understandable. Instead of 'Our platform revolutionizes everything,' explain what a customer can do, how the workflow works, and which cost or inconvenience it removes. Precision reduces confusion and gives others a fair opportunity to evaluate the claim."},
      {heading:"Vocabulary expands distinctions",text:"Learn words as tools for thinking, not decoration. 'Risk' concerns uncertainty and potential harm; 'volatility' describes movement or variation; 'liquidity' concerns ability to transact or meet near-term obligations depending on context. Using the right word lets you ask better questions. To remember vocabulary, write your own example and revisit it days later."},
      {heading:"Organize an explanation",text:"Start with a thesis, give two reasons, use a concrete example, acknowledge a limitation and summarize the practical consequence. This pattern helps with sales pitches, team meetings, political discussion and conversations at home. If you cannot explain an idea in plain words, you may need to study it more before relying on sophisticated phrasing."}
    ],
    terms:[["Precision","Accuracy and specificity in language."],["Thesis","Central claim an argument seeks to support."],["Qualification","A condition or limitation on a claim."]],
    question:{prompt:"Which opening statement is clearest to a prospective customer?",options:["We transform all modern ecosystems","We connect service requests to available businesses and track each job through completion","Our solution is maximally synergistic"],correct:1,why:"Concrete actions and outcomes communicate more than vague promotional terms."},
    practice:"Explain your business or profession in 30 seconds: problem, action, benefit, limitation.",
    source:{label:"Purdue OWL — Professional writing",url:"https://owl.purdue.edu/owl/subject_specific_writing/professional_technical_writing/index.html"},
    caution:"Vocabulary is for understanding, not intimidation."
  }
];
