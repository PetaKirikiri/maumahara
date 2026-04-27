import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type CourseRow = { id: number; name: string; description: string | null };

export function useStudentCourses(studentId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ['maumahara', 'student-courses', studentId],
    enabled: enabled && studentId != null,
    queryFn: async (): Promise<CourseRow[]> => {
      const sid = studentId as number;
      const { data: ce, error: e1 } = await supabase.from('class_enrollments').select('class_id').eq('student_id', sid);
      if (e1) throw e1;
      const classIds = [...new Set((ce ?? []).map((r) => r.class_id as number))];
      if (classIds.length === 0) return [];
      const { data: cl, error: e2 } = await supabase.from('classes').select('course_id').in('id', classIds);
      if (e2) throw e2;
      const courseIds = [
        ...new Set((cl ?? []).map((r) => r.course_id as number | null).filter((x): x is number => x != null)),
      ];
      if (courseIds.length === 0) return [];
      const { data: courses, error: e3 } = await supabase
        .from('courses')
        .select('id, name, description')
        .in('id', courseIds);
      if (e3) throw e3;
      return (courses ?? []) as CourseRow[];
    },
  });
}
