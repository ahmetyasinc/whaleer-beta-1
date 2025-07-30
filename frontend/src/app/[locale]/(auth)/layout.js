export default function HomeLayout({ children }) {
    return (
        <div  className="min-h-screen w-screen justify-center flex items-center hard-gradient">
            <main>{children}</main>
        </div>
    );
}

