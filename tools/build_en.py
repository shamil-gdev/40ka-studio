#!/usr/bin/env python3
"""Builds the English version of the site (en/) from the Russian pages.

The Russian pages are the source. This script copies index.html and cases/*.html into en/,
swaps every Russian text (text nodes and alt / content / aria-label / data-cursor attributes)
for its English version from TR below, fixes relative paths and links the RU / EN switch.

Run from the repository root after changing any Russian text:  python3 tools/build_en.py
It stops and lists any Russian text that has no translation yet, so nothing slips through.
The English pages are plain static files: they add nothing to the weight of the Russian ones.
"""
import os, re, sys, glob

BASE = 'https://shamil-gdev.github.io/40ka-studio/'

TR = {
    # ---------- shared: header, menu, contact ----------
    'нажмите, чтобы пропустить': 'tap to skip',
    'Работы': 'Work', 'Услуги': 'Services', 'О студии': 'About', 'Контакт': 'Contact',
    'Москва — Дубай — Эр-Рияд': 'Moscow — Dubai — Riyadh',
    '40ka — на главную': '40ka — home', 'Разделы': 'Sections', 'Меню': 'Menu',
    'Смотреть': 'View', 'Написать': 'Write', 'Скопировать': 'Copy', 'Мессенджеры': 'Messengers',
    'Расскажите о задаче.': 'Tell us about your project.',
    'Одного письма достаточно: кто вы, что хотите изменить и в какие сроки. Ответим в течение двух рабочих дней.':
        'One email is enough: who you are, what you want to change and by when. We reply within two working days.',

    # ---------- home: meta ----------
    '40ka: сорока на хвосте принесёт. Стратегия, айдентика, сайты, ролики и продвижение для бизнеса, который хотят рекомендовать. Москва, Дубай, Эр-Рияд.':
        '40ka: a little bird told them. Strategy, identity, websites, videos and promotion for businesses people want to recommend. Moscow, Dubai, Riyadh.',
    '40ka — стратегия, бренд, продвижение': '40ka — strategy, brand, promotion',
    'Сорока на ветке и слова «Сорока на хвосте принесёт»': 'A magpie on a branch and the words “A little bird told them”',
    'ru_RU': 'en_US',

    # ---------- home: hero and ticker ----------
    # «Сорока на хвосте принесёт» — the Russian saying for news that spreads by itself; English has its own bird for it
    'Сорока': 'A little', 'на хвосте': 'bird', 'принесёт': 'told them',
    'Стратегия, бренд и продвижение для бизнеса, который хотят рекомендовать.':
        'Strategy, brand and promotion for businesses people want to recommend.',
    'Москва': 'Moscow', 'Дубай': 'Dubai', 'Эр-Рияд': 'Riyadh',
    'Стратегия': 'Strategy', 'Айдентика': 'Identity', 'Упаковка': 'Packaging', 'Сайты': 'Websites',
    'Анимация': 'Animation', 'Ролики': 'Videos', 'Продвижение': 'Promotion', 'Арт-дирекшн': 'Art direction',

    # ---------- home: work ----------
    'Пять проектов, которые показывают, как мы думаем: от кофейни до университета, от Дагестана до Саудовской Аравии.':
        'Five projects that show how we think: from a coffee shop to a university, from Dagestan to Saudi Arabia.',
    'Кофейный бренд': 'Coffee brand',
    'Позиционирование, знак, паттерн, упаковка': 'Positioning, mark, pattern, packaging',
    'Исламский университет им. Саидбега Даитова&nbsp;': 'Saidbeg Daitov Islamic University&nbsp;',
    'Хасавюрт': 'Khasavyurt',
    'Образование, ребрендинг': 'Education, rebrand',
    'Эмблема, система логотипов, паттерн, носители': 'Emblem, logo system, pattern, applications',
    'Россия': 'Russia', 'Туризм': 'Tourism',
    'Платформа бренда, знак, паттерн, марки': 'Brand platform, mark, pattern, stamps',
    'Нота&nbsp;': 'Nota&nbsp;',
    'Парфюмерия, ретейл': 'Perfumery, retail',
    'Знак, логотип, палитра, упаковка, вывеска': 'Mark, logo, palette, packaging, signage',
    'Кофейня, HoReCa': 'Coffee shop, HoReCa',
    'Знак, паттерны, посуда, вывеска, соцсети': 'Mark, patterns, tableware, signage, social media',
    'Упаковка кофе Granada Coffee с орнаментом': 'Granada Coffee packaging with the ornament',
    'Эмблема университета на фасаде': 'The university emblem on the façade',
    'Логотип Mosaik Travel с орнаментом': 'Mosaik Travel logo with the ornament',
    'Флакон парфюма Нота в деревянной коробке': 'A Nota perfume bottle in a wooden box',
    'Интерьер кофейни Kofio': 'Kofio coffee shop interior',

    # ---------- home: services ----------
    'Что мы делаем': 'What we do',
    'Три этапа одного пути: создаём бренд, запускаем его и помогаем ему расти. Можно прийти на любой этап.':
        'Three stages of one path: we create the brand, launch it and help it grow. You can join at any stage.',
    'Проект': 'Project', 'Ежемесячно': 'Monthly', 'Что входит': 'What’s included',
    'Бренд': 'Brand', 'Кто вы, для кого и как это выглядит': 'Who you are, who it’s for and how it looks',
    'Ребрендинг': 'Rebrand', 'Гайдлайн': 'Guidelines',
    'Позиционирование, платформа бренда и полная визуальная система. Если бренд уже есть — сначала аудит.':
        'Positioning, brand platform and a complete visual system. If you already have a brand, we start with an audit.',
    'Исследование рынка и конкурентов': 'Market and competitor research',
    'Позиционирование и тон коммуникации': 'Positioning and tone of voice',
    'Знак, логотип, типографика, цвет, паттерны': 'Mark, logo, typography, colour, patterns',
    'Аудит и ребрендинг, если бренд уже есть': 'Audit and rebrand if you already have a brand',
    'Гайдлайн, с которым работает команда или ИИ': 'Guidelines your team — or AI — can work with',
    'Запуск': 'Launch', 'Бренд выходит в мир': 'The brand goes out into the world',
    'Сайт': 'Website', 'Анимация логотипа': 'Logo animation', 'Носители': 'Applications',
    'Сайт, упаковка и всё, с чем бренд встречает людей. Сайт с живой анимацией — как этот.':
        'The website, packaging and everything people meet the brand through. A website with live animation — like this one.',
    'Сайт или лендинг с анимацией': 'Website or landing page with animation',
    'Анимация логотипа и фирменный моушн': 'Logo animation and brand motion',
    'Упаковка, вывески, навигация, печать': 'Packaging, signage, wayfinding, print',
    'Шаблоны для соцсетей и презентаций': 'Templates for social media and presentations',
    'Рост': 'Growth', 'Бренд работает каждый день': 'The brand works every day',
    'Ролики для Reels': 'Reels', 'Контент': 'Content',
    'Ведём бренд дальше: продвижение, ролики и контент в одном стиле, кто бы их ни производил.':
        'We take the brand further: promotion, videos and content in one style, whoever produces them.',
    'Стратегия продвижения и контент-план': 'Promotion strategy and content plan',
    'Ролики для Reels: идея, съёмка, монтаж': 'Reels: idea, shoot, edit',
    'Визуал и оформление соцсетей': 'Social media visuals and design',
    'Арт-дирекшн подрядчиков и ИИ-производства': 'Art direction of contractors and AI production',
    'Еженедельные сессии и быстрые решения': 'Weekly sessions and quick decisions',
    'Сорока, которая летает по этому сайту, — тоже наша работа: интро, перелёты, её привычки. Так же мы делаем сайты и анимацию для клиентов.':
        'The magpie flying around this site is our work too: the intro, the flights, her habits. We make websites and animation for clients the same way.',
    'Проекты и ретейнер: формат и объём обсуждаем под задачу.': 'Projects and retainers: format and scope are agreed per task.',
    'Работаем на русском и английском.': 'We work in Russian and English.',

    # ---------- home: process ----------
    'Как работаем': 'How we work',
    'Четыре шага от первого разговора до бренда, который работает. Сроки зависят от объёма.':
        'Four steps from the first conversation to a brand that works. Timelines depend on scope.',
    'Погружение': 'Immersion',
    'Разговор с владельцем, рынок, конкуренты, аудитория. Понимаем, где бизнес хочет оказаться через три года.':
        'A conversation with the owner, the market, competitors, the audience. We understand where the business wants to be in three years.',
    '1–2 недели': '1–2 weeks',
    'Позиционирование, характер, ключевые сообщения и план: что нужно бренду, сайту и продвижению. Одна страница, с которой все согласны.':
        'Positioning, character, key messages and a plan for the brand, the website and promotion. One page everyone agrees on.',
    '2 недели': '2 weeks',
    'Создание': 'Creation',
    'Айдентика, сайт, анимация, упаковка — всё из одной системы. Показываем одно направление, доведённое до конца, а не три наброска.':
        'Identity, website, animation, packaging — all from one system. We show one direction taken all the way, not three sketches.',
    '4–8 недель': '4–8 weeks',
    'Запуск и рост': 'Launch and growth',
    'Выводим бренд в мир и отдаём гайдлайн, чтобы он мог жить и без нас. А если нужно — ведём каждый месяц: ролики, контент, продвижение.':
        'We take the brand out into the world and hand over guidelines so it can live without us. And if needed, we run it every month: videos, content, promotion.',
    'дальше — ежемесячно': 'then monthly',

    # ---------- home: details ----------
    'Детали': 'Details',
    'Визитки, вывеска, панама, бейдж — мелочи, из которых складывается бренд.':
        'Business cards, a sign, a bucket hat, a badge — the small things a brand is made of.',
    'Granada Coffee — визитки': 'Granada Coffee — business cards', 'Kofio — вывеска': 'Kofio — sign',
    'Mosaik Travel — панама': 'Mosaik Travel — bucket hat', 'Нота — вывеска': 'Nota — sign',
    'Университет — бейдж': 'University — badge', 'Granada Coffee — фургон': 'Granada Coffee — van',
    'Kofio — стаканы и посуда': 'Kofio — cups and tableware', 'Университет — свитшот': 'University — sweatshirt',
    'Granada Coffee: визитки': 'Granada Coffee: business cards', 'Kofio: вывеска': 'Kofio: sign',
    'Mosaik Travel: панама': 'Mosaik Travel: bucket hat', 'Нота: вывеска': 'Nota: sign',
    'Университет: бейдж': 'University: badge', 'Granada Coffee: фургон': 'Granada Coffee: van',
    'Kofio: стаканы и посуда': 'Kofio: cups and tableware', 'Университет: свитшот': 'University: sweatshirt',

    # ---------- home: about ----------
    'Видим': 'We see', 'ценное': 'value', 'Делаем его': 'We make it', 'заметным': 'visible',
    '40ka делает бренды и запускает их в жизнь: от стратегии и айдентики до сайта, роликов и продвижения. Название от сороки: птицы, которая замечает ценное и, в отличие от большинства, узнаёт себя в зеркале. Нам важно и то, и другое. Увидеть, что в бизнесе действительно ценно, и сделать так, чтобы он узнавал себя в своём бренде.':
        '40ka makes brands and launches them into the world: from strategy and identity to the website, videos and promotion. The name reads “soroka” — Russian for magpie, a bird that notices what is valuable and, unlike most, recognises itself in a mirror. Both matter to us: to see what is truly valuable in a business, and to make it recognise itself in its brand.',
    'Мы говорим с клиентом не о «красиво», а о том, как бренд влияет на выручку, цену и доверие.':
        'We talk to clients not about “pretty” but about how the brand affects revenue, price and trust.',
    'Работаем с компаниями в Москве, Дубае и Эр-Рияде. Умеем работать с арабской и кириллической типографикой в одной системе.':
        'We work with companies in Moscow, Dubai and Riyadh, and we can set Arabic and Cyrillic type in one system.',

    # ---------- cases: shared ----------
    'Сфера': 'Field', 'Где': 'Where', 'Сделали': 'What we did', 'Задача': 'The task', 'Решение': 'The solution',
    'Следующий проект': 'Next project',
    'Исламский университет': 'Islamic University', 'Нота': 'Nota', 'Нота — 40ka': 'Nota — 40ka',

    # ---------- case: Granada ----------
    'Кофейный бренд: обжарка и кофейни': 'Coffee brand: roastery and coffee shops',
    'Эр-Рияд, Саудовская Аравия': 'Riyadh, Saudi Arabia',
    'Позиционирование, знак и логотип на арабском, орнаментальная система, упаковка, носители, оформление точки':
        'Positioning, Arabic mark and logo, ornamental system, packaging, applications, store design',
    'Сделать кофейный бренд, который говорит с саудовским рынком на языке его наследия — Андалусия, Гранада, Альгамбра — и при этом выглядит современно, а не как сувенир.':
        'To create a coffee brand that speaks to the Saudi market in the language of its heritage — Andalusia, Granada, the Alhambra — and still looks contemporary rather than like a souvenir.',
    'В основе знака четыре слоя: орнамент Альгамбры, арабская буква غ, с которой начинается «Гранада», форма кофейного зерна и гранат как символ города. Из орнамента вырос паттерн, который живёт на упаковке, витрине и транспорте. Палитра: песок, тёмный шоколад и тёплая медь.':
        'The mark has four layers: the Alhambra ornament, the Arabic letter غ that begins “Granada”, the shape of a coffee bean, and the pomegranate as the symbol of the city. The ornament grew into a pattern that lives on packaging, shopfronts and vehicles. The palette: sand, dark chocolate and warm copper.',
    'Фасад кофейни Granada Coffee': 'Granada Coffee shopfront',
    'Буква غ в структуре знака': 'The letter غ in the structure of the mark',
    'Логотип на орнаменте': 'The logo on the ornament',
    'Пакет кофе на подиуме': 'A coffee bag on a plinth',
    'Визитки на кофейных зёрнах': 'Business cards on coffee beans',
    'Фирменный автомобиль': 'Branded van',
    'Пакет кофе в руках': 'A coffee bag in hand',

    # ---------- case: Kofio ----------
    'Знак и логотип, паттерны, стаканы и посуда, вывеска, интерьерная графика, соцсети':
        'Mark and logo, patterns, cups and tableware, signage, interior graphics, social media',
    'Новая кофейня в районе с жёсткой конкуренцией. Бренд должен был запоминаться с одного взгляда — на стакане в руке прохожего.':
        'A new coffee shop in a fiercely competitive neighbourhood. The brand had to be memorable at a glance — on a cup in a passer-by’s hand.',
    'Знак K соединяет три вещи: букву, чашку и пар. Он работает и как отдельный символ, и внутри логотипа. Из линий пара собран паттерн для стаканов и упаковки. Тёмно-зелёный, белый и тёплый оранжевый акцент.':
        'The K mark combines three things: a letter, a cup and steam. It works both as a standalone symbol and inside the logo. The lines of steam form a pattern for cups and packaging. Dark green, white and a warm orange accent.',
    'Логотип Kofio': 'Kofio logo', 'Вывеска': 'Sign', 'Стаканы и чашка': 'Cups and a mug', 'Знак на зёрнах': 'The mark on coffee beans',

    # ---------- case: Mosaik ----------
    'Платформа бренда, знак, паттерн, система макетов, фирменные марки': 'Brand platform, mark, pattern, layout system, branded stamps',
    'Турагентство с названием «Мозаика». Буквальная мозаика сделала бы знак перегруженным. Нужен был простой символ, который раскрывает идею: путешествие — это картина из множества ярких моментов.':
        'A travel agency called “Mosaic”. A literal mosaic would have overloaded the mark. It needed a simple symbol for the idea: a journey is a picture made of many bright moments.',
    'Знак — четыре фрагмента, собранные в букву M и одновременно в стрелку пути. Из фрагментов вырос паттерн, который работает как рамка для фотографий направлений. Слоган «Твой кусочек» задаёт тон всей коммуникации.':
        'The mark is four fragments assembled into the letter M and, at the same time, into an arrow showing the way. The fragments grew into a pattern that frames destination photos. The slogan “Your piece” sets the tone for all communication.',
    'Плакат Mosaik Travel: твой кусочек Петры': 'Mosaik Travel poster: your piece of Petra',
    'Логотип': 'Logo', 'Структура знака': 'Structure of the mark', 'Панама': 'Bucket hat', 'Фирменная марка': 'Branded stamp',

    # ---------- case: Nota ----------
    'Парфюмерная': 'Perfumery',
    'Знак, логотип, фирменная палитра, упаковка, вывеска': 'Mark, logo, brand palette, packaging, signage',
    'Парфюмерному магазину с именем «Нота» нужен был знак, который считывается и как буква, и как музыка, и выглядит как люкс, а не как масс-маркет.':
        'A perfume shop called “Nota” — a musical note in Russian — needed a mark that reads both as a letter and as music, and looks luxurious rather than mass-market.',
    'Буква Н собрана из четырёх нот, зеркально повторяющих друг друга. На расстоянии знак читается как монограмма, вблизи — как мелодия. Глубокий синий и приглушённое золото. На упаковке минимум: название, нота, аромат.':
        'The letter Н (the Cyrillic N) is built from four notes mirroring each other. From a distance the mark reads as a monogram, up close as a melody. Deep blue and muted gold. The packaging keeps to a minimum: the name, the note, the scent.',
    'Флакон Нота в деревянной коробке': 'A Nota bottle in a wooden box', 'Знак и логотип': 'Mark and logo', 'Вывеска магазина': 'Shop sign',

    # ---------- case: University ----------
    'Исламский университет имени Саидбега Даитова — 40ka': 'Saidbeg Daitov Islamic University — 40ka',
    'Исламский университет имени Саидбега Даитова': 'Saidbeg Daitov Islamic University',
    'Хасавюрт, Дагестан': 'Khasavyurt, Dagestan',
    'Аудит старого знака, новая эмблема, система логотипов, печать, паттерн, носители, шаблоны афиш, трёхъязычная система RU / AR / EN':
        'Audit of the old mark, a new emblem, logo system, seal, pattern, applications, poster templates, a trilingual RU / AR / EN system',
    'Университет вырос из старого знака: он не масштабировался, плохо читался и не передавал ни традицию, ни современность. Нужна была эмблема, которая одинаково уместна на печати ректора, на фасаде и в соцсетях.':
        'The university had outgrown its old mark: it did not scale, was hard to read and conveyed neither tradition nor modernity. It needed an emblem equally at home on the rector’s seal, on the façade and on social media.',
    'Эмблема собрана из четырёх элементов: открытая книга как основа знания, дерево, которое из неё растёт, свет и восьмиконечная звезда как отсылка к исламскому наследию. Зелёный и золото — ожидаемые цвета, но в сдержанных оттенках. Геометрический паттерн из звезды держит все носители вместе.':
        'The emblem is built from four elements: an open book as the foundation of knowledge, a tree growing from it, light, and an eight-pointed star that refers to Islamic heritage. Green and gold are the expected colours, but in restrained shades. A geometric pattern based on the star holds all the applications together.',
    'Книги с эмблемой университета': 'Books with the university emblem',
    'Эмблема, горизонтальный и вертикальный логотипы': 'Emblem, horizontal and vertical logos',
    'Эмблема на фасаде': 'The emblem on the façade', 'Визитки': 'Business cards', 'Лента и бейдж': 'Lanyard and badge',
    'Вышивка на свитшоте': 'Embroidery on a sweatshirt', 'Шаблоны афиш': 'Poster templates',
    'Логотип на фотографии Хасавюрта': 'The logo over a photo of Khasavyurt',
}

CYR = re.compile('[А-Яа-яЁё]')
ATTRS = ('alt', 'content', 'aria-label', 'data-cursor', 'title', 'data-name')


def translate(src, missing, name):
    # leave inline SVG, scripts and comments alone
    keep = []
    def hold(m):
        keep.append(m.group(0)); return '<k%d>' % (len(keep) - 1)
    s = re.sub(r'<svg.*?</svg>|<script.*?</script>|<!--.*?-->', hold, src, flags=re.S)

    def text(m):
        raw = m.group(1); t = raw.strip()
        if not t or not CYR.search(t): return m.group(0)
        if t in TR:
            lead = raw[:len(raw) - len(raw.lstrip())]; trail = raw[len(raw.rstrip()):]
            return '>' + lead + TR[t] + trail + '<'
        missing.add((name, t)); return m.group(0)
    s = re.sub(r'>([^<>]+)<', text, s)

    def attr(m):
        v = m.group(2)
        if not CYR.search(v) and v not in TR: return m.group(0)
        if v in TR: return '%s="%s"' % (m.group(1), TR[v])
        missing.add((name, m.group(1) + '=' + v)); return m.group(0)
    s = re.sub(r'\b(%s)="([^"]*)"' % '|'.join(ATTRS), attr, s)
    return re.sub(r'<k(\d+)>', lambda m: keep[int(m.group(1))], s)


def deeper(s):
    """one more ../ for files that live outside the pages (assets, images, icons)"""
    return re.sub(r'((?:src|href)=")((?:\.\./)?)(assets/|img/|favicon)', lambda m: m.group(1) + '../' + m.group(2) + m.group(3), s)


def build():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)
    pages = ['index.html'] + sorted(glob.glob('cases/*.html'))
    missing, out = set(), {}
    for p in pages:
        ru = open(p, encoding='utf-8').read()
        case = p.startswith('cases/')
        ru_url = BASE + ('' if p == 'index.html' else p)
        en_url = BASE + 'en/' + ('' if p == 'index.html' else p)
        alt = ('<link rel="alternate" hreflang="ru" href="%s">\n<link rel="alternate" hreflang="en" href="%s">\n' % (ru_url, en_url))

        # Russian page: the EN switch becomes a link, alternates in <head>
        en_link = ('../en/' + p) if case else 'en/index.html'
        ru2 = re.sub(r'<div class="lang">.*?</div>', '<div class="lang"><b>RU</b><a href="%s" hreflang="en" lang="en">EN</a></div>' % en_link, ru, count=1)
        ru2 = re.sub(r'<link rel="alternate" hreflang="[a-z]+" href="[^"]*">\n', '', ru2)
        ru2 = ru2.replace('</title>\n', '</title>\n' + alt, 1)
        if ru2 != ru: open(p, 'w', encoding='utf-8').write(ru2)

        # English page
        en = translate(ru2, missing, p)
        en = en.replace('<html lang="ru">', '<html lang="en">', 1)
        en = deeper(en)
        ru_link = ('../../' + p) if case else '../index.html'
        en = re.sub(r'<div class="lang">.*?</div>', '<div class="lang"><a href="%s" hreflang="ru" lang="ru">RU</a><b>EN</b></div>' % ru_link, en, count=1)
        en = en.replace('content="%s"' % ru_url, 'content="%s"' % en_url)
        if p == 'index.html': en = en.replace(BASE + 'img/og.png', BASE + 'img/og-en.png')
        out['en/' + p] = en
    if missing:
        print('No English yet for:')
        for n, t in sorted(missing): print('  %s: %s' % (n, t))
        sys.exit(1)
    for p, s in out.items():
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'w', encoding='utf-8').write(s)
        print('wrote', p)


if __name__ == '__main__':
    build()
