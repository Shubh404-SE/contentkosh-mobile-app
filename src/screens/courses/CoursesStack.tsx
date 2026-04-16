import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COURSES_STACK } from '../../constants/navigation';
import { CourseListScreen } from './CourseListScreen';
import { CourseSubjectsScreen } from './CourseSubjectsScreen';
import { CourseFormScreen } from './CourseFormScreen';
import { SubjectFormScreen } from './SubjectFormScreen';
import type { CourseRecord, SubjectRecord } from '../../api/coursesApi';

export type CoursesStackParamList = {
  [COURSES_STACK.LIST]: { initialExamId?: number } | undefined;
  [COURSES_STACK.SUBJECTS]: { courseId: number; examId: number; courseName?: string };
  [COURSES_STACK.COURSE_FORM]: { mode: 'create' | 'edit'; examId: number; course?: CourseRecord };
  [COURSES_STACK.SUBJECT_FORM]: {
    mode: 'create' | 'edit';
    examId: number;
    courseId: number;
    subject?: SubjectRecord;
  };
};

const Stack = createNativeStackNavigator<CoursesStackParamList>();

export function CoursesStack() {
  return (
    <Stack.Navigator
      initialRouteName={COURSES_STACK.LIST}
      screenOptions={{
        headerStyle: { backgroundColor: '#0b1220' },
        headerTintColor: '#f8fafc',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: '#0b1220' },
      }}
    >
      <Stack.Screen name={COURSES_STACK.LIST} component={CourseListScreen} options={{ title: 'Courses' }} />
      <Stack.Screen
        name={COURSES_STACK.SUBJECTS}
        component={CourseSubjectsScreen}
        options={({ route }) => ({ title: route.params.courseName ? `${route.params.courseName}` : 'Subjects' })}
      />
      <Stack.Screen
        name={COURSES_STACK.COURSE_FORM}
        component={CourseFormScreen}
        options={({ route }) => ({
          title: route.params.mode === 'create' ? 'New course' : 'Edit course',
        })}
      />
      <Stack.Screen
        name={COURSES_STACK.SUBJECT_FORM}
        component={SubjectFormScreen}
        options={({ route }) => ({
          title: route.params.mode === 'create' ? 'New subject' : 'Edit subject',
        })}
      />
    </Stack.Navigator>
  );
}
