/**
 * The demonstration newsroom of `seed-demo.ts`: a technology news portal. Every story, company and figure below is
 * fictitious; the covers are real, openly licensed photographs from Wikimedia Commons (public domain, CC0, CC BY or
 * CC BY-SA), credited to their authors and used only as illustration.
 */

export type Text = { pt: string; en: string };

/** A photograph on Wikimedia Commons: the file name, its author and licence as Commons states them. */
export interface CommonsPhoto { file: string; author: string; license: string }

export interface SeedArticle {
  category: string; tags: Text[]; author: 'editor' | 'reporter' | 'reviewer' | 'admin'; hoursAgo: number; featured?: boolean; breaking?: boolean;
  status?: 'review' | 'scheduled'; ptOnly?: boolean;
  photo: CommonsPhoto; caption: Text;
  pt: { title: string; subtitle: string; body: string[]; quote?: string; heading?: string };
  en: { title: string; subtitle: string; body: string[]; quote?: string; heading?: string };
}

export const SEED_CATEGORIES: Array<{ name: Text; color: string; description: Text }> = [
  { name: { pt: 'Inteligência Artificial', en: 'Artificial Intelligence' }, color: 'violet', description: { pt: 'Modelos, aplicações e os efeitos da IA no dia a dia.', en: 'Models, applications and the effects of AI on everyday life.' } },
  { name: { pt: 'Dispositivos', en: 'Devices' }, color: 'blue', description: { pt: 'Celulares, computadores, vestíveis e tudo o que cabe na mão.', en: 'Phones, computers, wearables and everything that fits in a hand.' } },
  { name: { pt: 'Segurança', en: 'Security' }, color: 'red', description: { pt: 'Falhas, golpes, privacidade e como se proteger.', en: 'Vulnerabilities, scams, privacy and how to stay safe.' } },
  { name: { pt: 'Negócios', en: 'Business' }, color: 'teal', description: { pt: 'Startups, investimentos, empresas de tecnologia e o mercado digital.', en: 'Startups, funding, tech companies and the digital economy.' } },
  { name: { pt: 'Ciência', en: 'Science' }, color: 'cyan', description: { pt: 'Pesquisa, computação quântica, satélites e exploração espacial.', en: 'Research, quantum computing, satellites and space exploration.' } },
  { name: { pt: 'Games', en: 'Gaming' }, color: 'grape', description: { pt: 'Jogos, consoles e esportes eletrônicos.', en: 'Games, consoles and esports.' } },
  { name: { pt: 'Mobilidade', en: 'Mobility' }, color: 'orange', description: { pt: 'Veículos elétricos, drones e transporte conectado.', en: 'Electric vehicles, drones and connected transport.' } },
  { name: { pt: 'Telecom', en: 'Telecom' }, color: 'indigo', description: { pt: '5G, banda larga, cabos e a infraestrutura da rede.', en: '5G, broadband, cables and the network’s infrastructure.' } },
];

/** The sections the front page shows as blocks, by Portuguese name. */
export const SEED_FRONT_PAGE_SECTIONS = ['Inteligência Artificial', 'Segurança', 'Dispositivos', 'Negócios'];

export const SEED_ARTICLES: SeedArticle[] = [
  {
    category: 'Inteligência Artificial', author: 'reporter', hoursAgo: 2, featured: true,
    tags: [{ pt: 'modelos de linguagem', en: 'language models' }, { pt: 'privacidade', en: 'privacy' }],
    photo: { file: 'Hand holding smartphone with blank white screen.jpg', author: 'Santeri Viinamäki', license: 'CC BY-SA 4.0' },
    caption: { pt: 'Imagem ilustrativa: o modelo compacto responde sem conexão com a internet.', en: 'Illustrative image: the compact model answers without an internet connection.' },
    pt: {
      title: 'Modelo de IA em português passa a rodar inteiramente no celular',
      subtitle: 'Versão compacta criada por um laboratório universitário funciona sem internet e não envia nenhum dado para servidores.',
      body: [
        'Pesquisadores do Laboratório de Linguagem Computacional da Universidade de Exemplo apresentaram nesta semana um modelo de linguagem treinado em português que cabe na memória de um celular intermediário e responde sem conexão com a internet.',
        'Com 3 bilhões de parâmetros e técnicas de compressão que reduzem o tamanho do modelo a menos de 2 gigabytes, o sistema resume textos, responde perguntas e corrige redações em tempo real. Nos testes da equipe, a primeira palavra da resposta aparece em menos de meio segundo.',
        'Como tudo é processado no próprio aparelho, nenhuma conversa deixa o telefone. Segundo os autores, esse é o principal argumento para o uso em escolas, consultórios e órgãos públicos, onde o envio de dados a servidores externos é restrito.',
        'O código e os pesos do modelo serão publicados com licença aberta até o fim do mês. A equipe agora trabalha numa versão capaz de entender comandos de voz com sotaques regionais.',
      ],
      heading: 'Privacidade como argumento', quote: 'O dado mais seguro é aquele que nunca sai do aparelho do usuário.',
    },
    en: {
      title: 'Portuguese-language AI model now runs entirely on the phone',
      subtitle: 'A compact version built by a university lab works offline and sends no data to any server.',
      body: [
        'Researchers at the Computational Language Lab of the University of Example this week presented a language model trained in Portuguese that fits in the memory of a mid-range phone and answers without an internet connection.',
        'With 3 billion parameters and compression techniques that shrink the model to under 2 gigabytes, the system summarizes texts, answers questions and corrects essays in real time. In the team’s tests, the first word of an answer appears in under half a second.',
        'Because everything is processed on the device itself, no conversation ever leaves the phone. According to the authors, that is the main argument for its use in schools, clinics and public agencies, where sending data to outside servers is restricted.',
        'The code and the model’s weights will be released under an open licence by the end of the month. The team is now working on a version that understands voice commands in regional accents.',
      ],
      heading: 'Privacy as the selling point', quote: 'The safest data is the data that never leaves the user’s device.',
    },
  },
  {
    category: 'Segurança', author: 'editor', hoursAgo: 1, breaking: true, featured: true,
    tags: [{ pt: 'vulnerabilidades', en: 'vulnerabilities' }, { pt: 'roteadores', en: 'routers' }],
    photo: { file: 'Wi-fi router.jpg', author: 'Solijon Solayev', license: 'CC BY-SA 4.0' },
    caption: { pt: 'Imagem ilustrativa: roteadores domésticos devem receber a atualização automaticamente.', en: 'Illustrative image: home routers should receive the update automatically.' },
    pt: {
      title: 'Falha em roteadores domésticos permite invasão remota; fabricantes liberam correção',
      subtitle: 'Brecha afeta modelos vendidos nos últimos quatro anos; especialistas recomendam atualizar o firmware ainda hoje.',
      body: [
        'Uma falha no painel de configuração de roteadores Wi-Fi domésticos permite que um invasor assuma o controle do aparelho pela internet, sem precisar de senha. A vulnerabilidade foi divulgada nesta manhã pelo Centro de Resposta a Incidentes de Exemplo, que estima 2 milhões de equipamentos expostos no país.',
        'Com o controle do roteador, o atacante pode redirecionar o tráfego da casa para páginas falsas de bancos e lojas. Não há, até agora, registro de exploração em massa, mas o código que demonstra o ataque já circula em fóruns.',
        'Três fabricantes publicaram atualizações de firmware. Na maioria dos modelos, a correção é instalada sozinha durante a madrugada; nos mais antigos, o usuário precisa acessar o painel do aparelho e clicar em "atualizar".',
        'Quem não conseguir atualizar deve, ao menos, desativar o acesso remoto ao painel e trocar a senha padrão de administrador, orientam os especialistas.',
      ],
      heading: 'Como se proteger', quote: 'O roteador é a porta de entrada da casa conectada, e muita gente nunca trocou a senha de fábrica.',
    },
    en: {
      title: 'Flaw in home routers allows remote takeover; manufacturers release fix',
      subtitle: 'The bug affects models sold over the past four years; experts recommend updating the firmware today.',
      body: [
        'A flaw in the settings page of home Wi-Fi routers lets an attacker take over the device over the internet without a password. The vulnerability was disclosed this morning by the Example Incident Response Center, which estimates 2 million exposed devices in the country.',
        'With control of the router, the attacker can redirect the household’s traffic to fake bank and shop pages. There is no record of mass exploitation so far, but code demonstrating the attack is already circulating on forums.',
        'Three manufacturers have published firmware updates. On most models the fix installs itself overnight; on older ones the user must open the device’s settings page and click “update”.',
        'Anyone unable to update should at least turn off remote access to the settings page and change the default administrator password, experts advise.',
      ],
      heading: 'How to stay safe', quote: 'The router is the front door of the connected home, and many people have never changed the factory password.',
    },
  },
  {
    category: 'Ciência', author: 'reporter', hoursAgo: 5, featured: true,
    tags: [{ pt: 'satélites', en: 'satellites' }, { pt: 'universidades', en: 'universities' }],
    photo: { file: 'ISS-38 NanoRacks CubeSat Deployment Iss038e044916.jpg', author: 'NASA', license: 'Public domain' },
    caption: { pt: 'Imagem ilustrativa: nanossatélites liberados em órbita baixa.', en: 'Illustrative image: nanosatellites released into low orbit.' },
    pt: {
      title: 'Nanossatélite universitário envia as primeiras imagens da órbita',
      subtitle: 'Equipamento do tamanho de uma caixa de sapatos foi montado por 40 estudantes e vai monitorar queimadas.',
      body: [
        'O primeiro nanossatélite construído inteiramente por estudantes da Universidade Federal de Exemplo enviou nesta madrugada suas primeiras imagens da Terra, três dias depois de ser liberado em órbita a 500 quilômetros de altitude.',
        'O equipamento, do tamanho de uma caixa de sapatos e com pouco mais de 4 quilos, levou quatro anos para ficar pronto e envolveu 40 alunos de engenharia, física e computação. As imagens chegam a uma antena instalada no telhado do próprio campus.',
        'A missão principal é detectar focos de queimada no Cerrado com uma câmera sensível ao infravermelho. Os dados serão abertos e poderão ser usados por brigadas de incêndio e pesquisadores.',
        'A equipe já trabalha no segundo satélite, que deve ser lançado em 2028 com um sensor para medir a umidade do solo.',
      ],
      heading: 'Dados abertos', quote: 'Ver a primeira imagem chegar foi a recompensa de quatro anos de trabalho.',
    },
    en: {
      title: 'University nanosatellite sends its first images from orbit',
      subtitle: 'The shoebox-sized craft was built by 40 students and will monitor wildfires.',
      body: [
        'The first nanosatellite built entirely by students of the Federal University of Example sent its first images of Earth overnight, three days after being released into orbit 500 kilometres up.',
        'The shoebox-sized craft, weighing just over 4 kilograms, took four years to complete and involved 40 engineering, physics and computing students. The images reach an antenna installed on the roof of the campus itself.',
        'Its main mission is to detect wildfire hotspots in the Cerrado with an infrared-sensitive camera. The data will be open and can be used by fire brigades and researchers.',
        'The team is already working on a second satellite, due for launch in 2028 with a sensor to measure soil moisture.',
      ],
      heading: 'Open data', quote: 'Watching the first image come in was the reward for four years of work.',
    },
  },
  {
    category: 'Negócios', author: 'editor', hoursAgo: 8, featured: true,
    tags: [{ pt: 'investimento', en: 'funding' }, { pt: 'agtech', en: 'agtech' }, { pt: 'drones', en: 'drones' }],
    photo: { file: 'Agriculture drone new technology.jpg', author: 'Shreesha Sharma', license: 'CC BY-SA 4.0' },
    caption: { pt: 'Imagem ilustrativa: drone de pulverização em uma plantação.', en: 'Illustrative image: a spraying drone over a plantation.' },
    pt: {
      title: 'Startup de drones agrícolas capta R$ 80 milhões para expandir operação',
      subtitle: 'Empresa fictícia AgroVoo usa visão computacional para aplicar defensivos só onde há praga e promete reduzir o uso em até 60%.',
      body: [
        'A AgroVoo, startup de Ribeirão de Exemplo que desenvolve drones de pulverização guiados por visão computacional, anunciou uma rodada de investimento de R$ 80 milhões liderada por fundos especializados em agronegócio.',
        'Os drones da empresa fotografam a lavoura antes de cada voo e um modelo de IA identifica as manchas atacadas por pragas. A aplicação é feita só nesses pontos, o que, segundo a startup, reduz em até 60% o volume de defensivos usado por hectare.',
        'O dinheiro será usado para abrir bases em três novos estados e para dobrar a equipe de engenharia, hoje com 70 pessoas. A empresa também quer oferecer o serviço por assinatura a pequenos produtores, que não teriam como comprar os equipamentos.',
        'O setor de tecnologia agrícola recebeu mais de R$ 2 bilhões em investimentos no ano passado, de acordo com uma associação do setor.',
      ],
      heading: 'Assinatura para pequenos produtores',
    },
    en: {
      title: 'Agricultural drone startup raises R$80 million to expand',
      subtitle: 'The fictional company AgroVoo uses computer vision to spray only where pests are, and promises up to 60% less pesticide.',
      body: [
        'AgroVoo, a startup from Ribeirão de Exemplo that builds spraying drones guided by computer vision, announced an R$80 million funding round led by funds specializing in agribusiness.',
        'The company’s drones photograph the field before each flight and an AI model identifies the patches attacked by pests. Spraying happens only on those spots which, according to the startup, cuts the volume of pesticide per hectare by up to 60%.',
        'The money will be used to open bases in three new states and to double the engineering team, currently 70 people. The company also wants to offer the service as a subscription to small farmers, who could not afford the equipment.',
        'Agricultural technology received more than R$2 billion in investment last year, according to an industry association.',
      ],
      heading: 'Subscriptions for small farmers',
    },
  },
  {
    category: 'Dispositivos', author: 'reporter', hoursAgo: 12, featured: true,
    tags: [{ pt: 'realidade virtual', en: 'virtual reality' }, { pt: 'lançamentos', en: 'launches' }],
    photo: { file: 'Virtual reality headset.jpg', author: 'FloppaIngénieur', license: 'CC BY 4.0' },
    caption: { pt: 'Imagem ilustrativa: lentes de um headset de realidade virtual.', en: 'Illustrative image: the lenses of a virtual reality headset.' },
    pt: {
      title: 'Óculos de realidade mista ficam 40% mais leves na nova geração',
      subtitle: 'Bateria no bolso e lentes mais finas tornam o uso prolongado mais confortável; preço continua alto.',
      body: [
        'A nova geração de óculos de realidade mista apresentada nesta semana numa feira de eletrônicos pesa 380 gramas, 40% menos que a anterior. A principal mudança é a bateria, que saiu da cabeça e passou para um módulo que vai no bolso, ligado por cabo.',
        'As lentes do tipo "pancake", mais finas, permitiram aproximar a tela dos olhos e encurtar o aparelho. Nos testes feitos pela reportagem, foi possível usar os óculos por uma hora sem o incômodo no nariz comum nos modelos anteriores.',
        'As câmeras externas também melhoraram: a imagem do ambiente real aparece com menos atraso e mais nitidez, o que facilita misturar janelas virtuais com a mesa de trabalho.',
        'O preço, porém, continua acima de R$ 15 mil, o que mantém o produto restrito a empresas e entusiastas.',
      ],
    },
    en: {
      title: 'Mixed reality headsets get 40% lighter in the new generation',
      subtitle: 'A pocket battery and thinner lenses make long sessions more comfortable; the price remains high.',
      body: [
        'The new generation of mixed reality headsets shown this week at an electronics fair weighs 380 grams, 40% less than the last one. The main change is the battery, which moved off the head into a pocket module connected by a cable.',
        'Thinner “pancake” lenses brought the screen closer to the eyes and shortened the device. In our tests, the headset could be worn for an hour without the pressure on the nose common in earlier models.',
        'The outward cameras also improved: the image of the real surroundings appears with less lag and more sharpness, which makes it easier to mix virtual windows with a real desk.',
        'The price, however, remains above R$15,000, which keeps the product limited to companies and enthusiasts.',
      ],
    },
  },
  {
    category: 'Mobilidade', author: 'reviewer', hoursAgo: 16,
    tags: [{ pt: 'veículos elétricos', en: 'electric vehicles' }, { pt: 'cidades', en: 'cities' }],
    photo: { file: '2024-0=424 Electric bus charging in Warsaw.jpg', author: 'Maksym Kozlenko', license: 'CC BY 4.0' },
    caption: { pt: 'Imagem ilustrativa: ônibus elétrico em um carregador de pantógrafo.', en: 'Illustrative image: an electric bus at a pantograph charger.' },
    pt: {
      title: 'Ônibus elétricos já são um terço da frota da Cidade de Exemplo',
      subtitle: 'Carregadores rápidos nos terminais permitem recarga em dez minutos entre uma viagem e outra.',
      body: [
        'A Cidade de Exemplo chegou a 620 ônibus elétricos em circulação, um terço da frota municipal, segundo balanço divulgado pela secretaria de mobilidade. Há três anos eram apenas 40.',
        'O avanço foi possível com a instalação de carregadores rápidos do tipo pantógrafo nos principais terminais: um braço desce do teto e recarrega o ônibus em cerca de dez minutos, entre uma viagem e outra.',
        'A prefeitura calcula que a troca já evitou a emissão de 45 mil toneladas de gás carbônico por ano e reduziu o ruído nos corredores de maior movimento. O custo de manutenção dos veículos elétricos também é menor, embora a compra seja mais cara.',
        'A meta é que metade da frota seja elétrica até 2028.',
      ],
      quote: 'O passageiro percebe a diferença no primeiro quarteirão: o ônibus não vibra e não faz barulho.',
    },
    en: {
      title: 'Electric buses now make up a third of Example City’s fleet',
      subtitle: 'Fast chargers at the terminals top up the buses in ten minutes between trips.',
      body: [
        'Example City now has 620 electric buses in service, a third of the municipal fleet, according to figures released by the mobility department. Three years ago there were only 40.',
        'The growth came with fast pantograph chargers at the main terminals: an arm lowers from the roof and recharges the bus in about ten minutes, between one trip and the next.',
        'The city estimates the switch already avoids 45,000 tonnes of carbon dioxide a year and has reduced noise on the busiest corridors. Maintenance of electric vehicles is also cheaper, although they cost more to buy.',
        'The goal is for half of the fleet to be electric by 2028.',
      ],
      quote: 'Passengers notice the difference within a block: the bus does not shake and makes no noise.',
    },
  },
  {
    category: 'Games', author: 'reporter', hoursAgo: 20,
    tags: [{ pt: 'jogos independentes', en: 'indie games' }, { pt: 'acessibilidade', en: 'accessibility' }],
    photo: { file: 'InclusiveGameLab Person-with-PS5-Controller 8 CC-BY-SA.jpg', author: 'InclusiveGameLab', license: 'CC BY-SA 4.0' },
    caption: { pt: 'Imagem ilustrativa: jogadora com um controle de videogame.', en: 'Illustrative image: a player holding a game controller.' },
    pt: {
      title: 'Jogo independente brasileiro passa de um milhão de jogadores',
      subtitle: 'Recursos de acessibilidade, como controles remapeáveis e modo para daltônicos, foram decisivos, diz o estúdio.',
      body: [
        'O jogo de aventura "Trilhas de Exemplo", criado por um estúdio independente de seis pessoas em Recife de Exemplo, passou de um milhão de jogadores quatro meses depois do lançamento.',
        'O estúdio atribui parte do sucesso aos recursos de acessibilidade: todos os botões podem ser remapeados, há modos para diferentes tipos de daltonismo, legendas ajustáveis e uma opção que reduz a velocidade das fases mais difíceis.',
        'Grupos de jogadores com deficiência recomendaram o título em redes sociais e fóruns, o que levou o jogo às listas de mais vendidos de duas lojas digitais.',
        'Uma versão para consoles está prevista para o próximo semestre.',
      ],
      quote: 'Acessibilidade não é um modo especial; é fazer o jogo para mais gente desde o começo.',
    },
    en: {
      title: 'Brazilian indie game passes one million players',
      subtitle: 'Accessibility features such as remappable controls and colour-blind modes made the difference, the studio says.',
      body: [
        'The adventure game “Trails of Example”, made by a six-person independent studio in Recife de Exemplo, passed one million players four months after release.',
        'The studio credits part of the success to its accessibility features: every button can be remapped, there are modes for different kinds of colour blindness, adjustable subtitles and an option that slows down the hardest levels.',
        'Groups of disabled players recommended the title on social networks and forums, which took the game into the best-seller lists of two digital stores.',
        'A console version is planned for next semester.',
      ],
      quote: 'Accessibility is not a special mode; it is making the game for more people from the start.',
    },
  },
  {
    category: 'Telecom', author: 'editor', hoursAgo: 26,
    tags: [{ pt: 'cabos submarinos', en: 'submarine cables' }, { pt: 'infraestrutura', en: 'infrastructure' }],
    photo: { file: 'Submarine Optical Cables.jpg', author: 'Lonnie Hagadorn', license: 'CC BY-SA 4.0' },
    caption: { pt: 'Imagem ilustrativa: cortes de cabos ópticos submarinos, com as camadas de proteção.', en: 'Illustrative image: cross-sections of submarine optical cables and their protective layers.' },
    pt: {
      title: 'Novo cabo submarino vai dobrar a capacidade de dados entre o Brasil e a Europa',
      subtitle: 'Cabo de 6 mil quilômetros terá 16 pares de fibra óptica e deve entrar em operação no segundo semestre.',
      body: [
        'Começou nesta semana o lançamento ao mar de um novo cabo submarino de fibra óptica que vai ligar o litoral do Nordeste à Europa. Com 6 mil quilômetros, o cabo deve dobrar a capacidade de tráfego de dados entre os dois continentes.',
        'São 16 pares de fibra, protegidos por camadas de aço, cobre e polietileno. Perto da costa, onde há risco de âncoras e redes de pesca, o cabo é enterrado no fundo do mar e recebe blindagem dupla.',
        'Além de mais capacidade, a rota direta reduz o tempo de resposta das conexões entre os dois continentes, o que interessa a serviços de nuvem, bancos e jogos on-line.',
        'O consórcio responsável, formado por operadoras e empresas de tecnologia, prevê que o cabo entre em operação no segundo semestre.',
      ],
      heading: 'Menos atraso',
    },
    en: {
      title: 'New submarine cable will double data capacity between Brazil and Europe',
      subtitle: 'The 6,000-kilometre cable will carry 16 fibre pairs and should enter service in the second half of the year.',
      body: [
        'Ships began laying a new submarine fibre-optic cable this week that will connect Brazil’s northeast coast to Europe. At 6,000 kilometres, the cable should double data traffic capacity between the two continents.',
        'It carries 16 fibre pairs, protected by layers of steel, copper and polyethylene. Near the coast, where anchors and fishing nets are a risk, the cable is buried in the seabed and double-armoured.',
        'Besides more capacity, the direct route cuts the response time of connections between the two continents, which matters to cloud services, banks and online games.',
        'The consortium in charge, made up of carriers and technology companies, expects the cable to enter service in the second half of the year.',
      ],
      heading: 'Less lag',
    },
  },
  {
    category: 'Inteligência Artificial', author: 'reporter', hoursAgo: 30,
    tags: [{ pt: 'saúde digital', en: 'digital health' }, { pt: 'hospitais', en: 'hospitals' }],
    photo: { file: 'X-ray Vision DVIDS78078.jpg', author: 'Senior Airman Julianne Showalter', license: 'Public domain' },
    caption: { pt: 'Imagem ilustrativa: especialista analisa exames de tomografia.', en: 'Illustrative image: a specialist reviews CT scans.' },
    pt: {
      title: 'Hospitais públicos testam IA para priorizar exames de imagem',
      subtitle: 'Sistema aponta tomografias com sinais de urgência para que o radiologista veja primeiro; decisão continua sendo do médico.',
      body: [
        'Cinco hospitais públicos do estado de Exemplo começaram a testar um sistema de inteligência artificial que analisa tomografias assim que elas são feitas e coloca no topo da fila as que têm sinais de urgência, como hemorragias e embolias.',
        'O sistema não dá diagnóstico: ele apenas reordena a lista de exames que o radiologista vai laudar. Nas primeiras semanas, o tempo até o laudo dos casos graves caiu de 50 para 12 minutos, segundo a coordenação do projeto.',
        'Os exames são processados em servidores do próprio hospital e não saem da rede da instituição. O projeto foi aprovado pelo comitê de ética e será avaliado por seis meses antes de uma possível expansão.',
        'Entidades médicas apoiam o teste, mas pedem transparência sobre os casos em que o sistema erra.',
      ],
      heading: 'O médico decide', quote: 'A ferramenta não substitui o radiologista; ela garante que ele veja primeiro quem não pode esperar.',
    },
    en: {
      title: 'Public hospitals test AI to prioritize imaging exams',
      subtitle: 'The system flags CT scans with signs of urgency so the radiologist sees them first; the decision stays with the doctor.',
      body: [
        'Five public hospitals in the state of Example began testing an artificial intelligence system that analyzes CT scans as soon as they are taken and moves those with signs of urgency, such as bleeding and embolisms, to the top of the queue.',
        'The system gives no diagnosis: it only reorders the list of exams the radiologist will report on. In the first weeks, the time to report on serious cases fell from 50 to 12 minutes, according to the project’s coordinators.',
        'The scans are processed on the hospital’s own servers and never leave its network. The project was approved by the ethics committee and will be evaluated for six months before a possible expansion.',
        'Medical associations support the trial but ask for transparency about the cases in which the system gets it wrong.',
      ],
      heading: 'The doctor decides', quote: 'The tool does not replace the radiologist; it makes sure they see first those who cannot wait.',
    },
  },
  {
    category: 'Segurança', author: 'editor', hoursAgo: 36,
    tags: [{ pt: 'golpes', en: 'scams' }, { pt: 'deepfake', en: 'deepfake' }],
    photo: { file: 'Concerned Phone Call (Unsplash).jpg', author: 'Ehimetalor Unuabona', license: 'CC0' },
    caption: { pt: 'Imagem ilustrativa: especialistas recomendam desligar e ligar de volta para confirmar pedidos de dinheiro.', en: 'Illustrative image: experts recommend hanging up and calling back to confirm requests for money.' },
    pt: {
      title: 'Golpes com voz clonada por IA crescem; veja como se proteger',
      subtitle: 'Criminosos imitam a voz de parentes a partir de poucos segundos de áudio publicados em redes sociais.',
      body: [
        'Os registros de golpes em que criminosos usam inteligência artificial para imitar a voz de um parente e pedir dinheiro triplicaram em um ano, segundo a delegacia de crimes cibernéticos da Cidade de Exemplo.',
        'Bastam poucos segundos de áudio, muitas vezes tirados de vídeos publicados em redes sociais, para que programas de clonagem reproduzam o timbre e o jeito de falar da vítima. A ligação costuma relatar uma emergência e pedir uma transferência imediata.',
        'A principal recomendação é desconfiar de qualquer pedido urgente de dinheiro, mesmo com uma voz conhecida: desligue e ligue de volta para o número que você já tem salvo. Combinar uma palavra-senha com a família também ajuda.',
        'Bancos lembram que nunca pedem senhas ou códigos por telefone.',
      ],
      heading: 'Palavra-senha em família', quote: 'Se a ligação pede pressa e dinheiro, a regra é desligar e confirmar por outro canal.',
    },
    en: {
      title: 'AI voice-cloning scams are rising; here is how to protect yourself',
      subtitle: 'Criminals imitate relatives’ voices from a few seconds of audio posted on social networks.',
      body: [
        'Reports of scams in which criminals use artificial intelligence to imitate a relative’s voice and ask for money have tripled in a year, according to Example City’s cybercrime police unit.',
        'A few seconds of audio, often taken from videos posted on social networks, are enough for cloning software to reproduce the victim’s tone and manner of speaking. The call usually describes an emergency and asks for an immediate transfer.',
        'The main advice is to distrust any urgent request for money, even in a familiar voice: hang up and call back on the number you already have saved. Agreeing on a family code word also helps.',
        'Banks point out that they never ask for passwords or codes over the phone.',
      ],
      heading: 'A family code word', quote: 'If the call asks for haste and money, the rule is to hang up and confirm through another channel.',
    },
  },
  {
    category: 'Ciência', author: 'reporter', hoursAgo: 44,
    tags: [{ pt: 'computação quântica', en: 'quantum computing' }],
    photo: { file: 'D-Wave Two 512 qubit Vesuvius chip.jpg', author: 'Steve Jurvetson', license: 'CC BY 2.0' },
    caption: { pt: 'Imagem ilustrativa: chip de processador quântico montado em sua placa.', en: 'Illustrative image: a quantum processor chip mounted on its board.' },
    pt: {
      title: 'Laboratório nacional apresenta processador quântico de 50 qubits',
      subtitle: 'Chip opera a temperaturas próximas do zero absoluto e ficará disponível para pesquisadores pela nuvem.',
      body: [
        'O Laboratório Nacional de Computação de Exemplo apresentou o primeiro processador quântico desenvolvido no país com 50 qubits, as unidades básicas de informação da computação quântica.',
        'O chip, feito de circuitos supercondutores, funciona dentro de um refrigerador que o mantém a uma temperatura próxima do zero absoluto. Nessas condições, os qubits podem representar vários estados ao mesmo tempo, o que permite explorar muitas combinações em paralelo.',
        'Os pesquisadores afirmam que o equipamento ainda não supera computadores convencionais em tarefas práticas, mas é suficiente para testar algoritmos de química, otimização e criptografia.',
        'A partir do próximo ano, universidades poderão enviar experimentos ao processador pela internet.',
      ],
    },
    en: {
      title: 'National lab unveils 50-qubit quantum processor',
      subtitle: 'The chip runs at temperatures near absolute zero and will be open to researchers through the cloud.',
      body: [
        'The National Computing Laboratory of Example unveiled the first quantum processor developed in the country with 50 qubits, the basic units of information in quantum computing.',
        'The chip, made of superconducting circuits, works inside a refrigerator that keeps it close to absolute zero. Under those conditions, qubits can represent several states at once, which allows many combinations to be explored in parallel.',
        'The researchers say the machine does not yet beat conventional computers at practical tasks, but it is enough to test algorithms for chemistry, optimization and cryptography.',
        'From next year, universities will be able to send experiments to the processor over the internet.',
      ],
    },
  },
  {
    category: 'Dispositivos', author: 'editor', hoursAgo: 52, ptOnly: true,
    tags: [{ pt: 'direito ao reparo', en: 'right to repair' }, { pt: 'celulares', en: 'phones' }],
    photo: { file: 'Repair Lab (48115787881).jpg', author: 'Redaktion NdW', license: 'CC BY 2.0' },
    caption: { pt: 'Imagem ilustrativa: técnico troca componentes de um smartphone.', en: 'Illustrative image: a technician replaces parts of a smartphone.' },
    pt: {
      title: 'Projeto de lei obriga fabricantes a vender peças de celular por dez anos',
      subtitle: 'Texto aprovado em comissão também exige manuais de reparo públicos e baterias que possam ser trocadas sem ferramentas especiais.',
      body: [
        'A comissão de defesa do consumidor aprovou nesta quarta-feira um projeto de lei que obriga os fabricantes de celulares e notebooks a manter peças de reposição à venda por dez anos depois do fim da fabricação de cada modelo.',
        'O texto também exige que os manuais de reparo sejam públicos e que a bateria possa ser trocada sem ferramentas especiais a partir de 2029. Assistências técnicas independentes passariam a ter acesso às mesmas peças que as autorizadas.',
        'Defensores do projeto dizem que a medida reduz o lixo eletrônico e o custo para o consumidor. Associações de fabricantes argumentam que o prazo é longo demais e pode encarecer os aparelhos.',
        'O projeto ainda precisa passar por outras duas comissões antes de ir ao plenário.',
      ],
      heading: 'Próximos passos',
    },
    en: { title: '', subtitle: '', body: [] },
  },
  {
    category: 'Negócios', author: 'reporter', hoursAgo: 60,
    tags: [{ pt: 'data centers', en: 'data centers' }, { pt: 'energia', en: 'energy' }],
    photo: { file: 'BalticServers data center.jpg', author: 'BalticServers.com', license: 'CC BY-SA 3.0' },
    caption: { pt: 'Imagem ilustrativa: corredor de servidores em um data center.', en: 'Illustrative image: an aisle of servers in a data center.' },
    pt: {
      title: 'Data centers apostam em energia renovável para conter o consumo da IA',
      subtitle: 'Demanda por processamento de modelos de inteligência artificial deve dobrar o consumo de energia do setor até 2030.',
      body: [
        'A expansão dos serviços de inteligência artificial está levando operadores de data centers a fechar contratos de longo prazo com usinas solares e eólicas. Só neste ano, três novos centros de dados anunciados no país terão energia 100% renovável.',
        'Treinar e operar grandes modelos de IA exige milhares de processadores gráficos funcionando ao mesmo tempo, que consomem muita energia e geram calor. Uma consultoria do setor estima que o consumo dos data centers brasileiros vai dobrar até 2030.',
        'Além da energia, a água usada no resfriamento entrou no debate. Os projetos mais novos adotam sistemas em circuito fechado, que reaproveitam a mesma água, ou resfriamento direto nos chips.',
        'Especialistas lembram que a matriz elétrica brasileira, majoritariamente renovável, é um atrativo para empresas estrangeiras que buscam reduzir emissões.',
      ],
      heading: 'A questão da água',
    },
    en: {
      title: 'Data centers turn to renewable energy to keep AI’s consumption in check',
      subtitle: 'Demand for running artificial intelligence models should double the sector’s energy use by 2030.',
      body: [
        'The growth of artificial intelligence services is leading data center operators to sign long-term contracts with solar and wind farms. This year alone, three new data centers announced in the country will run on 100% renewable energy.',
        'Training and running large AI models takes thousands of graphics processors working at once, which use a lot of energy and generate heat. An industry consultancy estimates that Brazilian data centers’ consumption will double by 2030.',
        'Besides energy, the water used for cooling has entered the debate. The newest projects use closed-loop systems that reuse the same water, or direct cooling on the chips.',
        'Experts note that Brazil’s mostly renewable electricity mix is an attraction for foreign companies seeking to cut emissions.',
      ],
      heading: 'The water question',
    },
  },
  {
    category: 'Mobilidade', author: 'reporter', hoursAgo: 0, status: 'review',
    tags: [{ pt: 'drones', en: 'drones' }, { pt: 'entregas', en: 'deliveries' }],
    photo: { file: 'Connect Robotics Delivery Drone.jpg', author: 'Eduardofamendes', license: 'CC BY-SA 4.0' },
    caption: { pt: 'Imagem ilustrativa: drone de entregas carregando um pacote.', en: 'Illustrative image: a delivery drone carrying a parcel.' },
    pt: {
      title: 'Entregas por drone começam em fase experimental em dois bairros',
      subtitle: 'Pacotes de até 2 quilos serão levados de uma farmácia a casas num raio de 5 quilômetros.',
      body: [
        'A agência de aviação civil autorizou o primeiro teste de entregas por drone em área urbana da Cidade de Exemplo. Durante seis meses, pacotes de até 2 quilos serão levados de uma farmácia a residências de dois bairros.',
        'Os drones voam a 60 metros de altura por rotas pré-definidas e baixam a encomenda por um cabo, sem pousar. Cada voo é acompanhado por um operador em terra.',
        'Os resultados vão orientar as regras para o uso comercial do serviço no país.',
      ],
    },
    en: {
      title: 'Drone deliveries begin trial in two neighbourhoods',
      subtitle: 'Parcels of up to 2 kilograms will be flown from a pharmacy to homes within 5 kilometres.',
      body: [
        'The civil aviation agency authorized the first trial of drone deliveries in an urban area of Example City. For six months, parcels of up to 2 kilograms will be flown from a pharmacy to homes in two neighbourhoods.',
        'The drones fly 60 metres up along predefined routes and lower the parcel on a cable without landing. Each flight is monitored by an operator on the ground.',
        'The results will shape the rules for commercial use of the service in the country.',
      ],
    },
  },
  {
    category: 'Games', author: 'editor', hoursAgo: -48, status: 'scheduled',
    tags: [{ pt: 'esports', en: 'esports' }],
    photo: { file: 'LCS Summer Split 2017 in Paris.jpg', author: 'Exilexi', license: 'CC0' },
    caption: { pt: 'Imagem ilustrativa: arena lotada numa final de esportes eletrônicos.', en: 'Illustrative image: a packed arena at an esports final.' },
    pt: {
      title: 'Final do campeonato nacional de esportes eletrônicos esgota ingressos',
      subtitle: 'Ginásio com 12 mil lugares recebe a decisão no sábado; transmissão on-line deve passar de 2 milhões de espectadores.',
      body: [
        'Os 12 mil ingressos para a final do campeonato nacional de esportes eletrônicos, marcada para sábado no Ginásio de Exemplo, se esgotaram em menos de uma hora.',
        'As duas equipes finalistas disputam um prêmio de R$ 1 milhão. A organização espera que a transmissão on-line passe de 2 milhões de espectadores simultâneos.',
      ],
    },
    en: {
      title: 'National esports championship final sells out',
      subtitle: 'A 12,000-seat arena hosts the decider on Saturday; the online stream should pass 2 million viewers.',
      body: [
        'All 12,000 tickets for the national esports championship final, set for Saturday at the Example Arena, sold out in under an hour.',
        'The two finalists compete for a R$1 million prize. The organizers expect the online stream to pass 2 million concurrent viewers.',
      ],
    },
  },
  {
    category: 'Telecom', author: 'reporter', hoursAgo: 70,
    tags: [{ pt: '5G', en: '5G' }, { pt: 'conectividade', en: 'connectivity' }],
    photo: { file: 'Zoomed in shot of mobile phone mast.jpg', author: 'Kernow Skies', license: 'CC BY-SA 3.0' },
    caption: { pt: 'Imagem ilustrativa: antenas de telefonia móvel no alto de uma torre.', en: 'Illustrative image: mobile network antennas on top of a mast.' },
    pt: {
      title: '5G chega a 90% dos municípios, mas velocidade ainda varia entre regiões',
      subtitle: 'Medições independentes mostram diferença de até quatro vezes entre capitais e cidades do interior.',
      body: [
        'A rede 5G já está disponível em 90% dos municípios do país, segundo dados da agência reguladora de telecomunicações. Há dois anos, a cobertura chegava a pouco mais da metade das cidades.',
        'Medições independentes feitas com aplicativos de teste de velocidade mostram, porém, grande diferença de desempenho: nas capitais, a média passa de 400 megabits por segundo; em cidades menores, fica abaixo de 100.',
        'A diferença se explica pela quantidade de antenas e pela faixa de frequência usada. Nas cidades do interior, as operadoras costumam usar faixas que alcançam distâncias maiores, mas transmitem menos dados.',
        'O edital do 5G prevê novas metas de cobertura em rodovias e escolas até 2029.',
      ],
      heading: 'Por que a velocidade muda',
    },
    en: {
      title: '5G reaches 90% of municipalities, but speeds still vary by region',
      subtitle: 'Independent measurements show up to a fourfold difference between state capitals and inland towns.',
      body: [
        '5G is now available in 90% of the country’s municipalities, according to the telecommunications regulator. Two years ago coverage reached little more than half of the cities.',
        'Independent measurements taken with speed-test apps, however, show large differences in performance: in state capitals the average is above 400 megabits per second; in smaller towns it stays below 100.',
        'The difference comes down to the number of antennas and the frequency band used. Inland, carriers tend to use bands that reach further but carry less data.',
        'The 5G auction rules set new coverage targets for highways and schools by 2029.',
      ],
      heading: 'Why the speed changes',
    },
  },
];
