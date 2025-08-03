import Hero from "@/components/home_component/Hero";

export const metadata = {
  title: "About",
  description: "Create, test, and implement crypto strategies with Whaleer.",
};

export default function AboutPage() {
  return (
    <section id="hero" className="hero section py-16">
      <div className="container mx-auto px-4" data-aos="fade-up" data-aos-delay="100">
        <div className="flex flex-col lg:flex-row items-start lg:items-center">
          
          {/* Left Text Content */}
          <div className="w-full lg:w-1/2 mb-8 lg:mb-0" data-aos="fade-up" data-aos-delay="200">
            <h1 className="text-3xl font-bold mb-6">About Whaleer</h1>

            <p className="mb-4 text-justify">
              <strong>Whaleer</strong> is an innovative web-based platform that enables users to design, test,
              and commercialize their own trading algorithms—regardless of their technical background.
              Our mission is to democratize algorithmic trading by making it accessible, efficient, and
              user-friendly for everyone, from complete beginners to advanced developers and professional traders.
            </p>

            <p className="mb-4 text-justify">
              At the core of Whaleer lies a powerful yet intuitive interface. Beginners can build trading
              strategies through simple configuration panels, while more experienced users can write and
              fine-tune their own algorithmic scripts with advanced customization options. By catering to
              all skill levels, Whaleer fosters a collaborative ecosystem where users can learn, experiment,
              and grow together.
            </p>

            <p className="mb-4 text-justify">
              Beyond algorithm creation, Whaleer features a dynamic marketplace where strategies can be
              shared, sold, or leased to other users. This opens up a new revenue stream for creators while
              providing investors access to diverse, ready-to-use strategies. Our platform encourages
              innovation and knowledge-sharing, creating a space where algorithm developers and algorithm
              consumers can interact and benefit from one another.
            </p>

            <p className="mb-4 text-justify">
              Our lightweight vector-based processing engine allows us to extend the limits of free-tier
              usage while maintaining high performance. Whaleer also offers premium features such as advanced
              analytics, backtesting tools, and increased strategy limits for users seeking enhanced capabilities.
              For institutions and advanced users, we provide access to data and strategy APIs, making
              integration and automation effortless.
            </p>

            <p className="mb-4 text-justify">
              Whaleer is not just a platform—it’s a movement toward more transparent, collaborative,
              and empowered trading for all.
            </p>
          </div>

          {/* Right Side Image */}
          <div className="w-full lg:w-1/2 flex justify-center">
            <div className="w-full h-[300px] rounded-xl shadow-md flex items-center justify-center">
              <img src="/img/logo5.png" alt="Hero Image" className="img-fluid rotating-img" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
