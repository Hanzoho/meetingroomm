'use client';
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import { motion } from 'framer-motion';

// Mock data for featured rooms
const featuredRooms = [
  {
    id: 1,
    name: 'ห้องประชุมใหญ่',
    capacity: 50,
    imageUrl: '/images/room1.jpg', // Placeholder image path
    features: ['Projector', 'Whiteboard', 'Video Conferencing'],
  },
  {
    id: 2,  
    name: 'ห้องระดมสมอง',
    capacity: 10,
    imageUrl: '/images/room2.jpg', // Placeholder image path
    features: ['Whiteboard', 'Sticky Notes', 'Coffee Machine'],
  },
  {
    id: 3,
    name: 'ห้องประชุมผู้บริหาร',
    capacity: 12,
    imageUrl: '/images/room3.jpg', // Placeholder image path
    features: ['Smart TV', 'Comfortable Chairs', 'Sound System'],
  },
];

const heroImages = [
  { src: '/images/room5.jpg', alt: 'ห้องประชุมสำหรับผู้บริหาร' },
];

const HomePage = () => {
  const autoplayPlugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true })
  );

  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
      },
    },
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative h-[560px] rounded-xl overflow-hidden">
        <Carousel
          plugins={[autoplayPlugin.current]}
          className="w-full h-full"
          opts={{
            loop: heroImages.length > 1,
          }}
        >
          <CarouselContent className="h-full">
            {heroImages.map((image, index) => (
              <CarouselItem key={image.src} className="h-full">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  style={{ objectFit: 'cover' }}
                  className="z-0"
                  priority={index === 0}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          {heroImages.length > 1 && (
            <>
              <CarouselPrevious />
              <CarouselNext />
            </>
          )}
        </Carousel>
        <div className="absolute inset-0 flex items-center justify-center text-center text-white">
          <div className="max-w-3xl mx-auto px-4">
            <h1
              className="text-4xl md:text-6xl font-bold mb-4"
              style={{ textShadow: '2px 2px 8px rgba(0, 0, 0, 0.7)' }}
            >
              จองห้องประชุมง่ายๆ ในไม่กี่คลิก
            </h1>
            <p
              className="text-lg md:text-xl mb-8"
              style={{ textShadow: '1px 1px 6px rgba(0, 0, 0, 0.7)' }}
            >
              ค้นหาและจองห้องประชุมที่สมบูรณ์แบบสำหรับทีมของคุณได้อย่างรวดเร็วและมีประสิทธิภาพ
            </p>
          <Link href="/bookingroom">
            <Button size="lg" className="text-lg px-8 py-6">
              ค้นหาห้องประชุม <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          </div>
        </div>
      </section>

      {/* Featured Rooms Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <h2 className="text-3xl font-bold text-center mb-12">ห้องประชุมแนะนำ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredRooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
                <div className="relative h-48 w-full">
                  <Image 
                    src={room.imageUrl} 
                    alt={room.name} 
                    fill
                    style={{objectFit: 'cover'}}
                  />
                </div>
                <CardHeader>
                  <CardTitle>{room.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow flex flex-col">
                  <div className="flex items-center text-muted-foreground">
                    <Users className="mr-2 h-5 w-5" />
                    <span>รองรับได้ {room.capacity} คน</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                      {room.features.map((feature) => (
                          <span key={feature} className="bg-secondary text-secondary-foreground text-xs font-medium px-2.5 py-1 rounded-full">
                              {feature}
                          </span>
                      ))}
                  </div>
                  <div className="mt-auto pt-4">
                    <Link href={`/bookingroom/${room.id}`}>
                        <Button className="w-full">
                            ดูรายละเอียดและจอง
                        </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link href="/bookingroom">
              <Button variant="outline" size="lg">
                  ดูห้องประชุมทั้งหมด
              </Button>
          </Link>
        </div>
      </motion.section>

      {/* How It Works Section */}
      <motion.section 
        className="bg-card text-card-foreground py-16 rounded-xl"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">ใช้งานง่ายเพียง 3 ขั้นตอน</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <motion.div 
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="bg-primary text-primary-foreground rounded-full h-16 w-16 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">ค้นหา</h3>
              <p className="text-muted-foreground">เลือกวัน เวลา และจำนวนผู้เข้าร่วมเพื่อค้นหาห้องที่ว่าง</p>
            </motion.div>
            <motion.div 
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <div className="bg-primary text-primary-foreground rounded-full h-16 w-16 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">เลือกและจอง</h3>
              <p className="text-muted-foreground">เลือกห้องประชุมที่ต้องการและทำการจองผ่านระบบออนไลน์</p>
            </motion.div>
            <motion.div 
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="bg-primary text-primary-foreground rounded-full h-16 w-16 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">เข้าใช้งาน</h3>
              <p className="text-muted-foreground">รับการยืนยันและรายละเอียดการเข้าใช้งานห้องประชุม</p>
            </motion.div>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default HomePage;