
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ryan's Web Solutions | Small Business Websites</title>
    <link href="https://fonts.googleapis.com/css?family=Roboto:400,700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&family=Roboto:400,700&display=swap" rel="stylesheet">
    <style>
        .hero-bg {
            position: relative;
            width: 100vw;
            min-height: 55vh;
            background: linear-gradient(90deg, rgba(45,62,80,0.7) 0%, rgba(79,140,255,0.5) 100%), url('https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=1500&q=80') center/cover no-repeat fixed;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            z-index: 1;
        }
        .hero-content {
            position: relative;
            z-index: 2;
            color: #fff;
            text-align: center;
            padding: 4rem 2rem 3rem 2rem;
            width: 100%;
        }
        .hero-content h1 {
            font-size: 3.2rem;
            font-family: 'Montserrat', 'Roboto', Arial, sans-serif;
            margin-bottom: 1rem;
            letter-spacing: 1.5px;
            text-shadow: 0 4px 24px rgba(45,62,80,0.25);
        }
        .hero-content p {
            font-size: 1.35rem;
            opacity: 0.97;
            margin-bottom: 2.2rem;
            text-shadow: 0 2px 12px rgba(45,62,80,0.18);
        }
        .hero-nav {
            margin-top: 1.2rem;
        }
        .hero-nav a {
            color: #fff;
            margin: 0 1.2rem;
            text-decoration: none;
            font-weight: 700;
            font-family: 'Montserrat', 'Roboto', Arial, sans-serif;
            letter-spacing: 0.5px;
            font-size: 1.05rem;
            padding: 0.3rem 0.7rem;
            border-radius: 6px;
            transition: background 0.2s, color 0.2s;
            background: rgba(45,62,80,0.18);
        }
        .hero-nav a:hover {
            background: #fff;
            color: #4f8cff;
        }
        header {
            display: none;
        }
        body {
            font-family: 'Roboto', Arial, sans-serif;
            margin: 0;
            background: linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%);
            color: #222;
            min-height: 100vh;
        }
        header {
            background: linear-gradient(90deg, #2d3e50 0%, #4f8cff 100%);
            color: #fff;
            padding: 2.5rem 0 2rem 0;
            text-align: center;
            box-shadow: 0 4px 24px rgba(79,140,255,0.10);
            border-bottom-left-radius: 32px;
            border-bottom-right-radius: 32px;
        }
        header h1 {
            margin: 0 0 0.5rem 0;
            font-size: 2.8rem;
            font-family: 'Montserrat', 'Roboto', Arial, sans-serif;
            letter-spacing: 1px;
        }
        header p {
            margin: 0;
            font-size: 1.25rem;
            opacity: 0.95;
        }
        nav {
            margin-top: 1.2rem;
        }
        nav a {
            color: #fff;
            margin: 0 1.2rem;
            text-decoration: none;
            font-weight: 700;
            font-family: 'Montserrat', 'Roboto', Arial, sans-serif;
            letter-spacing: 0.5px;
            font-size: 1.05rem;
            padding: 0.3rem 0.7rem;
            border-radius: 6px;
            transition: background 0.2s, color 0.2s;
        }
        nav a:hover {
            background: #fff;
            color: #4f8cff;
        }
        section {
            max-width: 950px;
            margin: 2.5rem auto;
            background: rgba(255,255,255,0.85);
            border-radius: 18px;
            box-shadow: 0 4px 32px rgba(79,140,255,0.07);
            padding: 2.5rem 2rem;
            backdrop-filter: blur(2px);
            animation: fadeInUp 0.8s cubic-bezier(.39,.575,.56,1.000);
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .services, .portfolio, .testimonials {
            display: flex;
            flex-wrap: wrap;
            gap: 2rem;
            justify-content: space-between;
        }
        .service, .project, .testimonial {
            flex: 1 1 250px;
            background: rgba(255,255,255,0.7);
            border-radius: 14px;
            padding: 1.7rem 1.2rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 16px rgba(79,140,255,0.08);
            transition: transform 0.18s, box-shadow 0.18s;
        }
        .service:hover, .project:hover {
            transform: translateY(-6px) scale(1.03);
            box-shadow: 0 8px 32px rgba(79,140,255,0.13);
        }
        .service h3, .project h3 {
            margin-top: 0;
            font-family: 'Montserrat', 'Roboto', Arial, sans-serif;
            color: #4f8cff;
        }
        .portfolio img {
            width: 100%;
            border-radius: 8px;
            margin-bottom: 0.7rem;
            box-shadow: 0 2px 12px rgba(79,140,255,0.10);
        }
        .testimonial {
            font-style: italic;
            background: rgba(79,140,255,0.07);
            border-left: 4px solid #4f8cff;
        }
        .testimonial strong {
            display: block;
            margin-top: 1rem;
            font-style: normal;
            color: #2d3e50;
        }
        form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        input, textarea {
            padding: 0.85rem;
            border: 1.5px solid #b6c6e3;
            border-radius: 6px;
            font-size: 1.05rem;
            background: rgba(255,255,255,0.95);
            transition: border 0.2s;
        }
        input:focus, textarea:focus {
            border: 1.5px solid #4f8cff;
            outline: none;
        }
        button {
            background: linear-gradient(90deg, #4f8cff 0%, #2d3e50 100%);
            color: #fff;
            border: none;
            padding: 0.85rem 1.7rem;
            border-radius: 6px;
            font-size: 1.08rem;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.2s, transform 0.15s;
            box-shadow: 0 2px 8px rgba(79,140,255,0.10);
        }
        button:hover {
            background: linear-gradient(90deg, #2d3e50 0%, #4f8cff 100%);
            transform: translateY(-2px) scale(1.04);
        }
        footer {
            text-align: center;
            padding: 1.7rem 0;
            background: linear-gradient(90deg, #2d3e50 0%, #4f8cff 100%);
            color: #fff;
            margin-top: 2.5rem;
            border-top-left-radius: 32px;
            border-top-right-radius: 32px;
            font-size: 1.05rem;
            letter-spacing: 0.5px;
        }
        @media (max-width: 900px) {
            section {
                padding: 1.5rem 0.5rem;
            }
        }
        @media (max-width: 700px) {
            .services, .portfolio, .testimonials {
                flex-direction: column;
            }
            header {
                border-bottom-left-radius: 18px;
                border-bottom-right-radius: 18px;
            }
            footer {
                border-top-left-radius: 18px;
                border-top-right-radius: 18px;
            }
        }
    </style>
</head>
<body>

    <div class="hero-bg">
        <div class="hero-content">
            <h1>Ryan's Web Solutions</h1>
            <p>Professional, affordable websites for small businesses</p>
            <div class="hero-nav">
                <a href="#services">Services</a>
                <a href="#portfolio">Portfolio</a>
                <a href="#contact">Contact</a>
            </div>
        </div>
    </div>

    <section id="about">
        <h2>About Me</h2>
        <p>Hi! I'm Ryan, a web developer passionate about helping small businesses grow online. I specialize in creating modern, responsive, and effective websites that help you reach more customers and make a great first impression.</p>
    </section>

    <section id="services">
        <h2>Services</h2>
        <div class="services">
            <div class="service">
                <h3>Custom Website Design</h3>
                <p>Beautiful, unique designs tailored to your brand and business goals.</p>
            </div>
            <div class="service">
                <h3>Mobile Optimization</h3>
                <p>Websites that look and work great on any device, from phones to desktops.</p>
            </div>
            <div class="service">
                <h3>SEO & Performance</h3>
                <p>Optimized for search engines and fast loading to help you get found and keep customers engaged.</p>
            </div>
            <div class="service">
                <h3>Ongoing Support</h3>
                <p>Reliable maintenance and updates so your site always stays fresh and secure.</p>
            </div>
        </div>
    </section>

    <section id="portfolio">
        <h2>Explore Examples</h2>
        <div class="portfolio">
                <a class="project" href="auto-shop.html" style="text-decoration:none;color:inherit;">
                    <img src="stock-images/autoshop.jpg" alt="Auto Shop Garage with Mechanics">
                    <h3>Auto Shop</h3>
                    <p>Dynamic website for an auto repair shop, featuring service listings, appointment booking, and customer testimonials.</p>
                </a>
                <a class="project" href="restaurant-cafe.html" style="text-decoration:none;color:inherit;">
                    <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=400&q=80" alt="Restaurant/Cafe Project">
                    <h3>Restaurant / Cafe</h3>
                    <p>Modern, inviting website for a restaurant or café, with an interactive menu, online ordering, and reservation features.</p>
                </a>
                <a class="project" href="landscaping.html" style="text-decoration:none;color:inherit;">
                    <img src="stock-images/landscaping.jpg" alt="Landscaping Crew at Work">
                    <h3>Landscaping</h3>
                    <p>Professional site for a landscaping business, showcasing services, project galleries, and easy contact options.</p>
                </a>
        </div>
    </section>

    <section id="contact">
        <h2>Contact Me</h2>
        <form action="mailto:your@email.com" method="POST" enctype="text/plain">
            <input type="text" name="name" placeholder="Your Name" required>
            <input type="email" name="email" placeholder="Your Email" required>
            <textarea name="message" rows="5" placeholder="How can I help your business?" required></textarea>
            <button type="submit">Send Message</button>
        </form>
    </section>

    <footer>
        &copy; 2025 Ryan's Web Solutions. All rights reserved.
    </footer>

</body>
</html>