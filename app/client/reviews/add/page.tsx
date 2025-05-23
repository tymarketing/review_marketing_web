'use client'
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, X } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase/client";
export default function ClientAddReviewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();
  
  const [formData, setFormData] = useState({
    platform: "",
    productName: "",
    optionName: "",
    price: "",
    shippingFee: "",
    seller: "",
    startDate: "",
    reviewTitle: "",
    reviewContent: "",
  });
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);



  const getUserId = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('세션 가져오기 오류:', error);
    } else if (session?.user) {
      setUserId(session.user.id);
    }
  };

  useEffect(() => {
    getUserId();
  }, []);

  // 페이지 로드 시 스토리지 버킷 확인
  useEffect(() => {
    const initStorage = async () => {
      try {
        await fetch('/api/storage');
      } catch (error) {
        console.log('스토리지 초기화 중 오류 발생');
      }
    };

    initStorage();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 폼 유효성 검사
      if (!formData.platform || !formData.productName || !formData.reviewTitle || !formData.reviewContent) {
        toast({
          title: "필수 항목 누락",
          description: "필수 항목을 모두 입력해주세요.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 로그인 여부 확인
      if (!userId) {
        toast({
          title: "로그인 필요",
          description: "리뷰를 등록하려면 로그인이 필요합니다.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 이미지 파일들을 base64 문자열로 변환
      const imageFiles = await Promise.all(
        images.map(async (image) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.readAsDataURL(image.file);
          });
        })
      );

      // API 요청
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          imageFiles,
          userId: userId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '리뷰 등록에 실패했습니다.');
      }

      toast({
        title: "리뷰 등록 성공",
        description: "리뷰가 성공적으로 등록되었습니다.",
      });

      // 리뷰 목록 페이지로 이동
      router.push('/client/reviews');
    } catch (error: any) {
      toast({
        title: "오류 발생",
        description: error.message || "리뷰 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files).map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">리뷰 등록</h1>

      <form onSubmit={handleSubmit} className="space-y-6 w-full">
        <div className="space-y-4">
          <Label>리뷰 이미지</Label>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />
          <div className="grid grid-cols-6 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square relative rounded-lg overflow-hidden border">
                  <Image
                    src={image.preview}
                    alt={`리뷰 이미지 ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddImage}
              className="aspect-square border-2 border-dashed rounded-lg flex items-center justify-center hover:border-primary transition-colors"
            >
              <Plus className="h-8 w-8 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="platform">플랫폼</Label>
            <Select
              value={formData.platform}
              onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="플랫폼 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coupang">쿠팡</SelectItem>
                <SelectItem value="gmarket">지마켓</SelectItem>
                <SelectItem value="11st">11번가</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="productName">제품명</Label>
            <Input
              id="productName"
              value={formData.productName}
              onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
              placeholder="제품명을 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="optionName">옵션명</Label>
            <Input
              id="optionName"
              value={formData.optionName}
              onChange={(e) => setFormData(prev => ({ ...prev, optionName: e.target.value }))}
              placeholder="옵션명을 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">가격</Label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              placeholder="가격을 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shippingFee">배송비</Label>
            <Input
              id="shippingFee"
              type="number"
              value={formData.shippingFee}
              onChange={(e) => setFormData(prev => ({ ...prev, shippingFee: e.target.value }))}
              placeholder="배송비를 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seller">판매자</Label>
            <Input
              id="seller"
              value={formData.seller}
              onChange={(e) => setFormData(prev => ({ ...prev, seller: e.target.value }))}
              placeholder="판매자를 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">리뷰 작성일</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">리뷰 내용</h2>
          <div className="space-y-2">
            <Label htmlFor="reviewTitle">리뷰 제목</Label>
            <Input
              id="reviewTitle"
              value={formData.reviewTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, reviewTitle: e.target.value }))}
              placeholder="리뷰 제목을 입력하세요"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reviewContent">리뷰 내용</Label>
            <textarea
              id="reviewContent"
              className="w-full min-h-[150px] p-3 border rounded-md"
              value={formData.reviewContent}
              onChange={(e) => setFormData(prev => ({ ...prev, reviewContent: e.target.value }))}
              placeholder="리뷰 내용을 입력하세요"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            취소
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "처리 중..." : "등록"}
          </Button>
        </div>
      </form>
    </div>
  );
} 